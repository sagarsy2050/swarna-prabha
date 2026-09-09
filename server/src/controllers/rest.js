import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Build standard REST handlers from a service exposing
 * list/get/create/update/remove. `ctx` passes the authenticated user + request
 * bits through to the service where domain rules live.
 */
export function restController(service, { softContext } = {}) {
  const ctx = (req) => ({
    user: req.user,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    ...(softContext ? softContext(req) : {}),
  });

  return {
    list: asyncHandler(async (req, res) => {
      const result = await service.list(req.query, ctx(req));
      res.json(result);
    }),
    get: asyncHandler(async (req, res) => {
      const data = await service.get(req.params.id, ctx(req));
      res.json({ data });
    }),
    create: asyncHandler(async (req, res) => {
      const data = await service.create(req.body, ctx(req));
      res.status(201).json({ data });
    }),
    update: asyncHandler(async (req, res) => {
      const data = await service.update(req.params.id, req.body, ctx(req));
      res.json({ data });
    }),
    remove: asyncHandler(async (req, res) => {
      const data = await service.remove(req.params.id, ctx(req));
      res.json({ data });
    }),
  };
}

export default restController;
