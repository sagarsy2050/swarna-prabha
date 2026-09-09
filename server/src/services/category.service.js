import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { serialize } from '../utils/serialize.js';
import { imageService } from './image.service.js';

/**
 * Jewellery categories and their classification-folder mapping. Every category
 * owns exactly one `folder` under `jewellery-images/` and that is the only place
 * its products' images may come from.
 */

const withCounts = {
  _count: { select: { products: { where: { isPublished: true } } } },
};

function shape(row) {
  if (!row) return row;
  const { _count, ...rest } = row;
  return serialize({
    ...rest,
    productCount: _count?.products ?? 0,
    imageCount: imageService.listFolder(row.folder).length,
  });
}

export const categoryService = {
  /** Public list. `?active=1` (default) hides disabled categories. */
  async list({ includeInactive = false } = {}) {
    const rows = await prisma.jewelleryCategory.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: withCounts,
    });
    return { data: rows.map(shape) };
  },

  async getBySlugOrId(key) {
    const row = await prisma.jewelleryCategory.findFirst({
      where: { OR: [{ slug: key }, { id: key }, { code: key }] },
      include: withCounts,
    });
    if (!row) throw ApiError.notFound('category not found');
    return shape(row);
  },

  /** Filenames available for a category's folder — powers the admin/jeweller picker. */
  async listImages(key) {
    const cat = await prisma.jewelleryCategory.findFirst({
      where: { OR: [{ slug: key }, { id: key }, { code: key }] },
      select: { id: true, code: true, slug: true, folder: true },
    });
    if (!cat) throw ApiError.notFound('category not found');
    const files = imageService.listFolder(cat.folder);
    return {
      data: {
        category: cat,
        folder: cat.folder,
        images: files.map((f) => ({ path: f, url: `/jewellery-images/${cat.folder}/${f}` })),
      },
    };
  },

  async create(body) {
    if (!imageService.folders().includes(body.folder)) {
      // Not fatal — a folder can be created later — but warn loudly via 422 so a
      // typo is caught rather than producing a permanently empty category.
      throw ApiError.unprocessable(
        `No "${body.folder}" directory under jewellery-images/. Create the folder (and add images) first.`,
        { code: 'CATEGORY_FOLDER_MISSING' },
      );
    }
    try {
      const row = await prisma.jewelleryCategory.create({ data: body, include: withCounts });
      return shape(row);
    } catch (e) {
      if (e.code === 'P2002') {
        throw ApiError.conflict(`A category with that ${e.meta?.target?.join('/')} already exists`);
      }
      throw e;
    }
  },

  async update(id, body) {
    const existing = await prisma.jewelleryCategory.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound('category not found');
    if (body.folder && body.folder !== existing.folder && !imageService.folders().includes(body.folder)) {
      throw ApiError.unprocessable(`No "${body.folder}" directory under jewellery-images/`, {
        code: 'CATEGORY_FOLDER_MISSING',
      });
    }
    try {
      const row = await prisma.jewelleryCategory.update({ where: { id }, data: body, include: withCounts });
      return shape(row);
    } catch (e) {
      if (e.code === 'P2002') throw ApiError.conflict('That slug or folder is already taken');
      throw e;
    }
  },

  async remove(id) {
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      throw ApiError.conflict(`Category has ${count} product(s); reassign or delete them first`);
    }
    await prisma.jewelleryCategory.delete({ where: { id } });
    return { id };
  },
};

export default categoryService;
