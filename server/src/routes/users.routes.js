import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { userService } from '../services/user.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  idParam,
  adminCreateUserBody,
  setRoleBody,
  setActiveBody,
} from '../middleware/schemas.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

router.get('/', asyncHandler(async (req, res) => res.json(await userService.list(req.query))));
router.get(
  '/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => res.json({ data: await userService.get(req.params.id) })),
);
router.post(
  '/',
  validate({ body: adminCreateUserBody }),
  asyncHandler(async (req, res) => {
    const data = await userService.adminCreate(req.body);
    res.status(201).json({ data });
  }),
);
router.patch(
  '/:id/role',
  validate({ params: idParam, body: setRoleBody }),
  asyncHandler(async (req, res) => {
    const data = await userService.setRole(req.params.id, req.body.role);
    res.json({ data });
  }),
);
router.patch(
  '/:id/active',
  validate({ params: idParam, body: setActiveBody }),
  asyncHandler(async (req, res) => {
    const data = await userService.setActive(req.params.id, req.body.isActive);
    res.json({ data });
  }),
);

export default router;
