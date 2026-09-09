import { asyncHandler } from '../utils/asyncHandler.js';
import { productService } from '../services/product.service.js';

const ctx = (req) => ({ user: req.user, ip: req.ip });

export const productController = {
  list: asyncHandler(async (req, res) => {
    res.json(await productService.list(req.query, ctx(req)));
  }),
  facets: asyncHandler(async (req, res) => {
    res.json(await productService.facets(req.query));
  }),
  get: asyncHandler(async (req, res) => {
    res.json({ data: await productService.get(req.params.id, ctx(req)) });
  }),
  create: asyncHandler(async (req, res) => {
    res.status(201).json({ data: await productService.create(req.body, ctx(req)) });
  }),
  update: asyncHandler(async (req, res) => {
    res.json({ data: await productService.update(req.params.id, req.body, ctx(req)) });
  }),
  remove: asyncHandler(async (req, res) => {
    res.json({ data: await productService.remove(req.params.id, ctx(req)) });
  }),
};

export default productController;
