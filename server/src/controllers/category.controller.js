import { asyncHandler } from '../utils/asyncHandler.js';
import { categoryService } from '../services/category.service.js';

export const categoryController = {
  list: asyncHandler(async (req, res) => {
    const includeInactive =
      (req.user?.role === 'ADMIN' || req.user?.role === 'JEWELLER') && req.query.all === '1';
    res.json(await categoryService.list({ includeInactive }));
  }),
  get: asyncHandler(async (req, res) => {
    res.json({ data: await categoryService.getBySlugOrId(req.params.id) });
  }),
  images: asyncHandler(async (req, res) => {
    res.json(await categoryService.listImages(req.params.id));
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json({ data: await categoryService.create(req.body) });
  }),
  update: asyncHandler(async (req, res) => {
    res.json({ data: await categoryService.update(req.params.id, req.body) });
  }),
  remove: asyncHandler(async (req, res) => {
    res.json({ data: await categoryService.remove(req.params.id) });
  }),
};

export default categoryController;
