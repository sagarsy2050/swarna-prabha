import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { serialize } from '../utils/serialize.js';
import { parsePagination, pageMeta } from '../utils/pagination.js';

/**
 * Jeweller shops. A JewellerProfile *is* the shop; there is no separate entity.
 * Discovery and shop pages are public; a jeweller edits their own via /me,
 * an admin edits any.
 */

function shape(row, extra = {}) {
  if (!row) return row;
  const { user, _count, ...rest } = row;
  return serialize({
    ...rest,
    jewellerId: user?.id ?? rest.userId,
    contactName: user?.fullName ?? null,
    productCount: _count?.products ?? extra.productCount ?? 0,
  });
}

const LIST_SELECT = {
  id: true, userId: true, shopName: true, slug: true, description: true, logoPath: true,
  city: true, region: true, country: true, verified: true, active: true, createdAt: true,
  user: { select: { id: true, fullName: true } },
};

export const shopService = {
  async list(query = {}, { includeInactive = false } = {}) {
    const { page, pageSize, skip, take } = parsePagination(query, { allowedSort: ['shopName', 'createdAt'] });
    const where = includeInactive ? {} : { active: true };
    if (query.q) {
      where.OR = [
        { shopName: { contains: query.q, mode: 'insensitive' } },
        { city: { contains: query.q, mode: 'insensitive' } },
        { region: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.jewellerProfile.findMany({
        where, skip, take, orderBy: [{ verified: 'desc' }, { shopName: 'asc' }],
        select: LIST_SELECT,
      }),
      prisma.jewellerProfile.count({ where }),
    ]);
    // product counts in one query
    const counts = await prisma.product.groupBy({
      by: ['jewellerId'],
      where: { isPublished: true, jewellerId: { in: rows.map((r) => r.userId) } },
      _count: { _all: true },
    });
    const cmap = Object.fromEntries(counts.map((c) => [c.jewellerId, c._count._all]));
    return {
      data: rows.map((r) => shape(r, { productCount: cmap[r.userId] || 0 })),
      meta: pageMeta(page, pageSize, total),
    };
  },

  async getBySlug(slug, { withProducts = true } = {}) {
    const row = await prisma.jewellerProfile.findUnique({
      where: { slug },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!row || !row.active) throw ApiError.notFound('shop not found');
    const out = shape(row);
    if (withProducts) {
      const products = await prisma.product.findMany({
        where: { jewellerId: row.userId, isPublished: true },
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true, folder: true } },
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        },
      });
      out.products = products.map((p) => serialize({
        ...p,
        primaryImage: p.images[0]
          ? { path: p.images[0].path, url: `/jewellery-images/${p.images[0].folder}/${p.images[0].path}`, alt: p.images[0].alt }
          : null,
      }));
      out.productCount = products.length;
    }
    return out;
  },

  async getMine(userId) {
    const row = await prisma.jewellerProfile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, fullName: true } } },
    });
    if (!row) throw ApiError.notFound('You do not have a shop profile');
    return shape(row);
  },

  async update(userId, body, { asAdmin = false, targetId } = {}) {
    const where = asAdmin ? { id: targetId } : { userId };
    const existing = await prisma.jewellerProfile.findUnique({ where });
    if (!existing) throw ApiError.notFound('shop not found');

    const data = {};
    const fields = ['shopName', 'description', 'logoPath', 'addressLine1', 'addressLine2', 'city',
      'region', 'postalCode', 'country', 'phone', 'openingHours', 'appointmentSlots', 'active'];
    for (const f of fields) if (body[f] !== undefined) data[f] = body[f];
    if (body.email !== undefined) data.email = body.email || null;
    if (asAdmin && body.verified !== undefined) data.verified = body.verified;

    try {
      const row = await prisma.jewellerProfile.update({
        where: { id: existing.id }, data,
        include: { user: { select: { id: true, fullName: true } } },
      });
      return shape(row);
    } catch (e) {
      if (e.code === 'P2002') throw ApiError.conflict('That shop name/slug is already taken');
      throw e;
    }
  },
};

export default shopService;
