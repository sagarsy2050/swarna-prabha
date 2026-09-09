import { asyncHandler } from '../utils/asyncHandler.js';
import { shopService } from '../services/shop.service.js';

export const shopController = {
  list: asyncHandler(async (req, res) => {
    res.json(await shopService.list(req.query));
  }),
  get: asyncHandler(async (req, res) => {
    res.json({ data: await shopService.getBySlug(req.params.slug) });
  }),
  mine: asyncHandler(async (req, res) => {
    res.json({ data: await shopService.getMine(req.user.id) });
  }),
  updateMine: asyncHandler(async (req, res) => {
    res.json({ data: await shopService.update(req.user.id, req.body) });
  }),
  adminUpdate: asyncHandler(async (req, res) => {
    res.json({ data: await shopService.update(null, req.body, { asAdmin: true, targetId: req.params.id }) });
  }),
};

export default shopController;
