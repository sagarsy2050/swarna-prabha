import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { serialize } from '../utils/serialize.js';
import { parsePagination, pageMeta } from '../utils/pagination.js';

/**
 * Appointment booking against a jeweller's shop.
 *
 * Availability comes from the shop's `appointmentSlots` (per weekday) minus slots
 * already taken by an active (PENDING/CONFIRMED) appointment. A partial unique
 * index enforces "one active booking per jeweller+date+slot" at the DB level;
 * this service also checks first for a friendly error and catches the 23505 race.
 *
 * Customer: book, view own, cancel own.
 * Jeweller/Admin: view their shop's, confirm / reject / complete.
 */

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const ACTIVE = ['PENDING', 'CONFIRMED'];

const INCLUDE = {
  customer: { select: { id: true, fullName: true, email: true } },
  jeweller: {
    select: { id: true, fullName: true, jewellerProfile: { select: { shopName: true, slug: true } } },
  },
  product: { select: { id: true, name: true } },
};

function shape(row) {
  if (!row) return row;
  return serialize({
    ...row,
    date: row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date,
    shop: row.jeweller?.jewellerProfile
      ? { jewellerId: row.jeweller.id, name: row.jeweller.jewellerProfile.shopName, slug: row.jeweller.jewellerProfile.slug }
      : null,
  });
}

function parseDateStrict(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) throw ApiError.badRequest('date must be YYYY-MM-DD');
  const d = new Date(`${str}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest('Invalid date');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (d < today) throw ApiError.badRequest('Cannot book an appointment in the past');
  return d;
}

export const appointmentService = {
  /**
   * Bookable slots for a jeweller on a date: the weekday's configured slots,
   * minus ones already actively booked.
   */
  async availability({ jewellerId, date }) {
    const day = parseDateStrict(date);
    const shop = await prisma.jewellerProfile.findUnique({ where: { userId: jewellerId } });
    if (!shop) throw ApiError.notFound('shop not found');
    const weekday = WEEKDAYS[day.getUTCDay()];
    const all = Array.isArray(shop.appointmentSlots?.[weekday]) ? shop.appointmentSlots[weekday] : [];
    const taken = await prisma.appointment.findMany({
      where: { jewellerId, date: day, status: { in: ACTIVE } },
      select: { timeSlot: true },
    });
    const takenSet = new Set(taken.map((t) => t.timeSlot));
    return {
      data: {
        jewellerId,
        date,
        weekday,
        slots: all.map((s) => ({ time: s, available: !takenSet.has(s) })),
        available: all.filter((s) => !takenSet.has(s)),
      },
    };
  },

  async list(query, ctx) {
    const { page, pageSize, skip, take, orderBy } = parsePagination(query, {
      allowedSort: ['date', 'status', 'createdAt'],
    });
    const where = {};
    if (ctx.user.role === 'CUSTOMER') where.customerId = ctx.user.id;
    else if (ctx.user.role === 'JEWELLER') where.jewellerId = ctx.user.id;
    if (query.status) where.status = query.status;
    const [rows, total] = await Promise.all([
      prisma.appointment.findMany({ where, skip, take, orderBy, include: INCLUDE }),
      prisma.appointment.count({ where }),
    ]);
    return { data: rows.map(shape), meta: pageMeta(page, pageSize, total) };
  },

  async get(id, ctx) {
    const row = await prisma.appointment.findUnique({ where: { id }, include: INCLUDE });
    if (!row) throw ApiError.notFound('appointment not found');
    const mine =
      ctx.user.role === 'ADMIN' || row.customerId === ctx.user.id || row.jewellerId === ctx.user.id;
    if (!mine) throw ApiError.forbidden('Not your appointment');
    return shape(row);
  },

  /** Customer books a slot. */
  async create(body, ctx) {
    const day = parseDateStrict(body.date);
    const shop = await prisma.jewellerProfile.findUnique({ where: { userId: body.jewellerId } });
    if (!shop || !shop.active) throw ApiError.badRequest('This shop is not accepting appointments');

    const weekday = WEEKDAYS[day.getUTCDay()];
    const slots = Array.isArray(shop.appointmentSlots?.[weekday]) ? shop.appointmentSlots[weekday] : [];
    if (!slots.includes(body.timeSlot)) {
      throw ApiError.unprocessable('That time slot is not offered on this day', { code: 'SLOT_NOT_OFFERED' });
    }

    if (body.productId) {
      const p = await prisma.product.findUnique({ where: { id: body.productId }, select: { jewellerId: true } });
      if (!p || p.jewellerId !== body.jewellerId) {
        throw ApiError.badRequest('productId is not sold by this shop');
      }
    }

    const clash = await prisma.appointment.findFirst({
      where: { jewellerId: body.jewellerId, date: day, timeSlot: body.timeSlot, status: { in: ACTIVE } },
      select: { id: true },
    });
    if (clash) {
      throw ApiError.conflict('This time slot is no longer available. Please select another time.', {
        code: 'SLOT_TAKEN',
      });
    }

    try {
      const row = await prisma.appointment.create({
        data: {
          customerId: ctx.user.id,
          jewellerId: body.jewellerId,
          productId: body.productId || null,
          serviceType: body.serviceType || 'CONSULTATION',
          date: day,
          timeSlot: body.timeSlot,
          status: 'PENDING',
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          notes: body.notes || null,
        },
        include: INCLUDE,
      });
      return shape(row);
    } catch (e) {
      if (e.code === 'P2002') {
        throw ApiError.conflict('This time slot is no longer available. Please select another time.', {
          code: 'SLOT_TAKEN',
        });
      }
      throw e;
    }
  },

  /**
   * Customer may cancel their own (only while PENDING/CONFIRMED) and edit notes.
   * Jeweller/Admin may CONFIRM / REJECT / COMPLETE / CANCEL and reschedule.
   */
  async update(id, body, ctx) {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('appointment not found');
    const isCustomer = existing.customerId === ctx.user.id;
    const isStaff = ctx.user.role === 'ADMIN' || existing.jewellerId === ctx.user.id;
    if (!isCustomer && !isStaff) throw ApiError.forbidden('Not your appointment');

    const data = {};
    if (body.notes !== undefined) data.notes = body.notes;

    if (body.status !== undefined) {
      if (isCustomer && !isStaff) {
        if (body.status !== 'CANCELLED') throw ApiError.forbidden('Customers can only cancel');
        if (!ACTIVE.includes(existing.status)) {
          throw ApiError.conflict(`Cannot cancel an appointment that is ${existing.status}`);
        }
      }
      data.status = body.status;
    }

    if ((body.date !== undefined || body.timeSlot !== undefined) && isStaff) {
      const day = body.date ? parseDateStrict(body.date) : existing.date;
      const slot = body.timeSlot || existing.timeSlot;
      const clash = await prisma.appointment.findFirst({
        where: { jewellerId: existing.jewellerId, date: day, timeSlot: slot, status: { in: ACTIVE }, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw ApiError.conflict('That slot is already taken', { code: 'SLOT_TAKEN' });
      data.date = day;
      data.timeSlot = slot;
    }

    try {
      const row = await prisma.appointment.update({ where: { id }, data, include: INCLUDE });
      return shape(row);
    } catch (e) {
      if (e.code === 'P2002') throw ApiError.conflict('That slot is already taken', { code: 'SLOT_TAKEN' });
      throw e;
    }
  },

  async remove(id, ctx) {
    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('appointment not found');
    if (ctx.user.role !== 'ADMIN' && existing.customerId !== ctx.user.id) {
      throw ApiError.forbidden('Not your appointment');
    }
    // Soft-cancel rather than hard delete so the slot history is kept.
    await prisma.appointment.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { id };
  },
};

export default appointmentService;
