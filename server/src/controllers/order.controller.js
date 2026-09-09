import { asyncHandler } from '../utils/asyncHandler.js';
import { cartService, orderService } from '../services/order.service.js';

const ctx = (req) => ({ user: req.user });

export const cartController = {
  get: asyncHandler(async (req, res) => {
    res.json({ data: await cartService.get(req.user.id) });
  }),
  addItem: asyncHandler(async (req, res) => {
    res.status(201).json({ data: await cartService.addItem(req.user.id, req.body) });
  }),
  setQuantity: asyncHandler(async (req, res) => {
    res.json({ data: await cartService.setQuantity(req.user.id, req.params.productId, req.body.quantity) });
  }),
  clear: asyncHandler(async (req, res) => {
    res.json({ data: await cartService.clear(req.user.id) });
  }),
};

export const orderController = {
  checkout: asyncHandler(async (req, res) => {
    res.status(201).json({ data: await orderService.checkout(req.user.id, req.body) });
  }),
  list: asyncHandler(async (req, res) => {
    res.json(await orderService.list(req.query, ctx(req)));
  }),
  get: asyncHandler(async (req, res) => {
    res.json({ data: await orderService.get(req.params.id, ctx(req)) });
  }),
  setStatus: asyncHandler(async (req, res) => {
    res.json({ data: await orderService.setStatus(req.params.id, req.body.status, ctx(req)) });
  }),
};
