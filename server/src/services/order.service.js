import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { serialize } from '../utils/serialize.js';
import { parsePagination, pageMeta } from '../utils/pagination.js';
import { ORDER_STATUS_FLOW } from '../../../shared/constants.js';

/**
 * Cart + checkout + orders.
 *
 * The cart is server-authoritative (one per customer). Checkout runs in a single
 * transaction: stock is re-checked and decremented, the cart is split into one
 * Order per jeweller, a pending Payment row is created, and the cart is cleared.
 * Nothing is ever reported as bought unless that transaction commits.
 */

const CURRENCY = 'INR';

function primaryImageUrl(images) {
  const p = images?.find((i) => i.isPrimary) || images?.[0];
  return p ? `/jewellery-images/${p.folder}/${p.path}` : null;
}

// ── Cart ────────────────────────────────────────────────────────────────────

async function loadCart(customerId) {
  const cart = await prisma.cart.upsert({
    where: { customerId },
    update: {},
    create: { customerId },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
              jeweller: { select: { id: true, fullName: true, jewellerProfile: { select: { shopName: true, slug: true } } } },
            },
          },
        },
      },
    },
  });
  return cart;
}

function shapeCart(cart) {
  const items = cart.items
    .filter((it) => it.product)
    .map((it) => {
      const unit = Number(it.unitPrice);
      const live = Number(it.product.price);
      return {
        productId: it.productId,
        name: it.product.name,
        image: primaryImageUrl(it.product.images),
        unitPrice: unit,
        livePrice: live,
        priceChanged: unit !== live,
        quantity: it.quantity,
        lineTotal: unit * it.quantity,
        stock: it.product.stock,
        availability: it.product.availability,
        inStock: it.product.availability !== 'UNAVAILABLE' && it.product.stock >= it.quantity,
        shop: it.product.jeweller?.jewellerProfile
          ? { jewellerId: it.product.jeweller.id, name: it.product.jeweller.jewellerProfile.shopName, slug: it.product.jeweller.jewellerProfile.slug }
          : null,
      };
    });
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return serialize({
    id: cart.id,
    items,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    subtotal,
    currency: CURRENCY,
    hasBlockingIssue: items.some((i) => !i.inStock),
  });
}

export const cartService = {
  async get(customerId) {
    return shapeCart(await loadCart(customerId));
  },

  async addItem(customerId, { productId, quantity }) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isPublished) throw ApiError.notFound('product not found');
    if (product.availability === 'UNAVAILABLE') {
      throw ApiError.unprocessable('This piece is currently unavailable', { code: 'UNAVAILABLE' });
    }
    const cart = await prisma.cart.upsert({ where: { customerId }, update: {}, create: { customerId } });
    const existing = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    const nextQty = (existing?.quantity || 0) + quantity;
    if (product.availability === 'IN_STOCK' && nextQty > product.stock) {
      throw ApiError.unprocessable(`Only ${product.stock} in stock`, { code: 'INSUFFICIENT_STOCK' });
    }
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity: nextQty },
      create: { cartId: cart.id, productId, quantity, unitPrice: product.price },
    });
    return shapeCart(await loadCart(customerId));
  },

  async setQuantity(customerId, productId, quantity) {
    const cart = await prisma.cart.findUnique({ where: { customerId } });
    if (!cart) throw ApiError.notFound('cart is empty');
    if (quantity <= 0) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id, productId } });
      return shapeCart(await loadCart(customerId));
    }
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('product not found');
    if (product.availability === 'IN_STOCK' && quantity > product.stock) {
      throw ApiError.unprocessable(`Only ${product.stock} in stock`, { code: 'INSUFFICIENT_STOCK' });
    }
    await prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity },
    });
    return shapeCart(await loadCart(customerId));
  },

  async clear(customerId) {
    const cart = await prisma.cart.findUnique({ where: { customerId } });
    if (cart) await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return shapeCart(await loadCart(customerId));
  },
};

// ── Orders ──────────────────────────────────────────────────────────────────

const ORDER_INCLUDE = {
  items: true,
  payment: true,
  customer: { select: { id: true, fullName: true, email: true } },
  jeweller: { select: { id: true, fullName: true, jewellerProfile: { select: { shopName: true, slug: true } } } },
};

function shapeOrder(o) {
  return serialize({
    ...o,
    shop: o.jeweller?.jewellerProfile
      ? { jewellerId: o.jeweller.id, name: o.jeweller.jewellerProfile.shopName, slug: o.jeweller.jewellerProfile.slug }
      : null,
    items: o.items.map((it) => ({
      ...it,
      imageUrl: it.imagePathSnapshot ? `/jewellery-images/${it.imagePathSnapshot}` : null,
    })),
  });
}

export const orderService = {
  /** Checkout: turn the cart into one order per jeweller. Transactional. */
  async checkout(customerId, { contactName, contactPhone, shippingAddress }) {
    const cart = await loadCart(customerId);
    const items = cart.items.filter((it) => it.product);
    if (items.length === 0) throw ApiError.badRequest('Your cart is empty');

    const created = await prisma.$transaction(async (tx) => {
      // group by jeweller
      const byJeweller = new Map();
      for (const it of items) {
        const jid = it.product.jewellerId;
        if (!byJeweller.has(jid)) byJeweller.set(jid, []);
        byJeweller.get(jid).push(it);
      }

      const orders = [];
      for (const [jewellerId, group] of byJeweller) {
        let subtotal = 0;
        const orderItems = [];
        for (const it of group) {
          // re-read for a fresh stock number inside the tx
          const p = await tx.product.findUnique({ where: { id: it.productId } });
          if (!p || !p.isPublished || p.availability === 'UNAVAILABLE') {
            throw ApiError.unprocessable(`"${it.product.name}" is no longer available`, { code: 'ITEM_UNAVAILABLE' });
          }
          if (p.availability === 'IN_STOCK') {
            if (p.stock < it.quantity) {
              throw ApiError.unprocessable(`"${p.name}" — only ${p.stock} left`, { code: 'INSUFFICIENT_STOCK' });
            }
            await tx.product.update({ where: { id: p.id }, data: { stock: { decrement: it.quantity } } });
          }
          const unit = Number(p.price);
          const line = unit * it.quantity;
          subtotal += line;
          const img = it.product.images?.[0];
          orderItems.push({
            productId: p.id,
            nameSnapshot: p.name,
            imagePathSnapshot: img ? `${img.folder}/${img.path}` : null,
            unitPrice: unit,
            quantity: it.quantity,
            lineTotal: line,
          });
        }
        const order = await tx.order.create({
          data: {
            customerId,
            jewellerId,
            status: 'PENDING',
            subtotal,
            total: subtotal,
            currency: CURRENCY,
            contactName,
            contactPhone,
            shippingAddress,
            items: { create: orderItems },
            payment: { create: { amount: subtotal, currency: CURRENCY, method: 'manual', status: 'PENDING' } },
          },
          include: ORDER_INCLUDE,
        });
        orders.push(order);
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return orders;
    });

    return created.map(shapeOrder);
  },

  async list(query, ctx) {
    const { page, pageSize, skip, take, orderBy } = parsePagination(query, {
      allowedSort: ['placedAt', 'total', 'status'],
    });
    const where = {};
    if (ctx.user.role === 'CUSTOMER') where.customerId = ctx.user.id;
    else if (ctx.user.role === 'JEWELLER') where.jewellerId = ctx.user.id;
    if (query.status) where.status = query.status;
    const [rows, total] = await Promise.all([
      prisma.order.findMany({ where, skip, take, orderBy, include: ORDER_INCLUDE }),
      prisma.order.count({ where }),
    ]);
    return { data: rows.map(shapeOrder), meta: pageMeta(page, pageSize, total) };
  },

  async get(id, ctx) {
    const o = await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
    if (!o) throw ApiError.notFound('order not found');
    const mine = ctx.user.role === 'ADMIN' || o.customerId === ctx.user.id || o.jewellerId === ctx.user.id;
    if (!mine) throw ApiError.forbidden('Not your order');
    return shapeOrder(o);
  },

  /** Jeweller (own) / admin move an order along the status flow. */
  async setStatus(id, status, ctx) {
    const o = await prisma.order.findUnique({ where: { id } });
    if (!o) throw ApiError.notFound('order not found');
    if (ctx.user.role === 'JEWELLER' && o.jewellerId !== ctx.user.id) {
      throw ApiError.forbidden('Not your order');
    }
    const allowed = ORDER_STATUS_FLOW[o.status] || [];
    if (!allowed.includes(status)) {
      throw ApiError.conflict(
        `Cannot move an order from ${o.status} to ${status}. Allowed: ${allowed.join(', ') || 'none'}`,
        { code: 'BAD_TRANSITION' },
      );
    }
    const result = await prisma.$transaction(async (tx) => {
      if (status === 'CANCELLED') {
        const items = await tx.orderItem.findMany({ where: { orderId: id, productId: { not: null } } });
        for (const it of items) {
          await tx.product.updateMany({
            where: { id: it.productId, availability: 'IN_STOCK' },
            data: { stock: { increment: it.quantity } },
          });
        }
        await tx.payment.updateMany({ where: { orderId: id, status: 'PENDING' }, data: { status: 'FAILED' } });
      }
      if (status === 'CONFIRMED') {
        await tx.payment.updateMany({
          where: { orderId: id, status: 'PENDING' },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }
      return tx.order.update({ where: { id }, data: { status }, include: ORDER_INCLUDE });
    });
    return shapeOrder(result);
  },
};

export default orderService;
