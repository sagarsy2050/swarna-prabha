import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { serialize } from '../utils/serialize.js';
import { parsePagination, pageMeta } from '../utils/pagination.js';
import { imageService } from './image.service.js';

/**
 * Product catalogue. Public reads are anonymous and only ever return published
 * products; authoring is JEWELLER (own products) / ADMIN (any). Every image on a
 * product is validated against its category's classification folder.
 */

const CARD_INCLUDE = {
  category: { select: { id: true, code: true, name: true, slug: true, folder: true } },
  jeweller: {
    select: { id: true, fullName: true, jewellerProfile: { select: { shopName: true, slug: true, city: true } } },
  },
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
};

const SORTABLE = ['name', 'price', 'createdAt', 'weightGrams'];

function toCard(row) {
  if (!row) return row;
  const primary = row.images?.find((i) => i.isPrimary) || row.images?.[0] || null;
  return serialize({
    ...row,
    shop: row.jeweller?.jewellerProfile
      ? {
          jewellerId: row.jeweller.id,
          name: row.jeweller.jewellerProfile.shopName,
          slug: row.jeweller.jewellerProfile.slug,
          city: row.jeweller.jewellerProfile.city,
        }
      : null,
    primaryImage: primary
      ? { path: primary.path, url: `/jewellery-images/${primary.folder}/${primary.path}`, alt: primary.alt }
      : null,
    imageUrls: (row.images || []).map((i) => ({
      path: i.path,
      url: `/jewellery-images/${i.folder}/${i.path}`,
      alt: i.alt,
      isPrimary: i.isPrimary,
    })),
  });
}

async function resolveCategory(key) {
  if (!key) return null;
  return prisma.jewelleryCategory.findFirst({
    where: { OR: [{ id: key }, { slug: key }, { code: key }] },
  });
}

async function resolveJewellerId(shopKey) {
  if (!shopKey) return null;
  const prof = await prisma.jewellerProfile.findFirst({
    where: { OR: [{ userId: shopKey }, { slug: shopKey }] },
    select: { userId: true },
  });
  return prof?.userId || shopKey;
}

export const productService = {
  /**
   * Public / staff catalogue list.
   * @param ctx.user  when a JEWELLER/ADMIN passes ?all=1, drafts of their own
   *                   (jeweller) or everyone's (admin) are included.
   */
  async list(query = {}, ctx = {}) {
    const { page, pageSize, skip, take, orderBy } = parsePagination(query, { allowedSort: SORTABLE });

    const where = {};
    const staff = ctx.user && (ctx.user.role === 'ADMIN' || ctx.user.role === 'JEWELLER');
    const wantsAll = query.all === '1' && staff;
    if (!wantsAll) where.isPublished = true;
    if (wantsAll && ctx.user.role === 'JEWELLER') where.jewellerId = ctx.user.id;
    if (query.mine === 'true' && ctx.user) where.jewellerId = ctx.user.id;

    const cat = await resolveCategory(query.category);
    if (query.category && !cat) return { data: [], meta: pageMeta(page, pageSize, 0) };
    if (cat) where.categoryId = cat.id;

    if (query.shop) where.jewellerId = await resolveJewellerId(query.shop);
    if (query.metal) where.metal = { equals: query.metal, mode: 'insensitive' };
    if (query.purity) where.purity = { equals: query.purity, mode: 'insensitive' };
    if (query.stone) where.stone = { contains: query.stone, mode: 'insensitive' };
    if (query.availability) where.availability = query.availability;
    if (query.priceMin != null || query.priceMax != null) {
      where.price = {};
      if (query.priceMin != null) where.price.gte = Number(query.priceMin);
      if (query.priceMax != null) where.price.lte = Number(query.priceMax);
    }
    if (query.weightMin != null || query.weightMax != null) {
      where.weightGrams = {};
      if (query.weightMin != null) where.weightGrams.gte = Number(query.weightMin);
      if (query.weightMax != null) where.weightGrams.lte = Number(query.weightMax);
    }
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
        { metal: { contains: query.q, mode: 'insensitive' } },
        { stone: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where, skip, take, orderBy, include: CARD_INCLUDE }),
      prisma.product.count({ where }),
    ]);
    return { data: rows.map(toCard), meta: pageMeta(page, pageSize, total) };
  },

  async get(id, ctx = {}) {
    const row = await prisma.product.findUnique({ where: { id }, include: CARD_INCLUDE });
    if (!row) throw ApiError.notFound('product not found');
    const staff = ctx.user && (ctx.user.role === 'ADMIN' || (ctx.user.role === 'JEWELLER' && ctx.user.id === row.jewellerId));
    if (!row.isPublished && !staff) throw ApiError.notFound('product not found');
    return toCard(row);
  },

  async create(body, ctx) {
    const category = await prisma.jewelleryCategory.findUnique({ where: { id: body.categoryId } });
    if (!category) throw ApiError.badRequest('categoryId does not exist');

    let jewellerId = ctx.user.id;
    if (ctx.user.role === 'ADMIN' && body.jewellerId) {
      const j = await prisma.user.findFirst({ where: { id: body.jewellerId, role: 'JEWELLER' } });
      if (!j) throw ApiError.badRequest('jewellerId is not a jeweller');
      jewellerId = j.id;
    }

    const imageRows = imageService.buildProductImages(category.folder, body.images || []);

    const created = await prisma.product.create({
      data: {
        name: body.name,
        categoryId: category.id,
        jewellerId,
        description: body.description ?? null,
        metal: body.metal ?? null,
        purity: body.purity ?? null,
        weightGrams: body.weightGrams ?? null,
        stone: body.stone ?? null,
        price: body.price,
        currency: body.currency || 'INR',
        stock: body.stock ?? 0,
        availability: body.availability || 'IN_STOCK',
        isPublished: body.isPublished ?? true,
        images: imageRows.length ? { create: imageRows } : undefined,
      },
      include: CARD_INCLUDE,
    });
    return toCard(created);
  },

  async update(id, body, ctx) {
    const existing = await prisma.product.findUnique({ where: { id }, include: { category: true } });
    if (!existing) throw ApiError.notFound('product not found');
    if (ctx.user.role === 'JEWELLER' && existing.jewellerId !== ctx.user.id) {
      throw ApiError.forbidden('Not your product');
    }

    let category = existing.category;
    if (body.categoryId && body.categoryId !== existing.categoryId) {
      category = await prisma.jewelleryCategory.findUnique({ where: { id: body.categoryId } });
      if (!category) throw ApiError.badRequest('categoryId does not exist');
    }

    const data = {};
    for (const f of ['name', 'description', 'metal', 'purity', 'weightGrams', 'stone', 'price', 'stock', 'availability', 'isPublished']) {
      if (body[f] !== undefined) data[f] = body[f];
    }
    if (body.currency) data.currency = body.currency;
    if (category.id !== existing.categoryId) data.categoryId = category.id;

    // Images are replaced wholesale when provided, and re-validated against the
    // (possibly new) category folder.
    let imageOp;
    if (body.images !== undefined) {
      const rows = imageService.buildProductImages(category.folder, body.images);
      imageOp = { deleteMany: {}, create: rows };
    } else if (category.id !== existing.categoryId) {
      // Category changed but images not resent — re-validate the existing set.
      const current = await prisma.productImage.findMany({ where: { productId: id } });
      imageService.buildProductImages(
        category.folder,
        current.map((i) => ({ path: i.path, alt: i.alt, isPrimary: i.isPrimary, sortOrder: i.sortOrder })),
      );
      imageOp = { updateMany: { where: { productId: id }, data: { folder: category.folder } } };
    }
    if (imageOp) data.images = imageOp;

    const updated = await prisma.product.update({ where: { id }, data, include: CARD_INCLUDE });
    return toCard(updated);
  },

  async remove(id, ctx) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('product not found');
    if (ctx.user.role === 'JEWELLER' && existing.jewellerId !== ctx.user.id) {
      throw ApiError.forbidden('Not your product');
    }
    await prisma.product.delete({ where: { id } });
    return { id };
  },

  /** Distinct filter values for the current catalogue — powers the filter UI. */
  async facets(query = {}) {
    const cat = await resolveCategory(query.category);
    const where = { isPublished: true, ...(cat ? { categoryId: cat.id } : {}) };
    const [metals, purities, stones, price] = await Promise.all([
      prisma.product.findMany({ where, distinct: ['metal'], select: { metal: true } }),
      prisma.product.findMany({ where, distinct: ['purity'], select: { purity: true } }),
      prisma.product.findMany({ where, distinct: ['stone'], select: { stone: true } }),
      prisma.product.aggregate({ where, _min: { price: true, weightGrams: true }, _max: { price: true, weightGrams: true } }),
    ]);
    const clean = (rows, k) => [...new Set(rows.map((r) => r[k]).filter(Boolean))].sort();
    return {
      data: {
        metal: clean(metals, 'metal'),
        purity: clean(purities, 'purity'),
        stone: clean(stones, 'stone'),
        priceMin: serialize(price._min.price) ?? 0,
        priceMax: serialize(price._max.price) ?? 0,
        weightMin: serialize(price._min.weightGrams) ?? 0,
        weightMax: serialize(price._max.weightGrams) ?? 0,
      },
    };
  },
};

export default productService;
