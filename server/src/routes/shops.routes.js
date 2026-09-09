import { Router } from 'express';
import { shopController } from '../controllers/shop.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, slugParam, shopUpdateBody, shopAdminUpdateBody } from '../middleware/schemas.js';

const router = Router();

// Public discovery.
router.get('/', shopController.list);

// A jeweller's own shop.
router.get('/me', authenticate, requireRole('JEWELLER', 'ADMIN'), shopController.mine);
router.patch(
  '/me',
  authenticate,
  requireRole('JEWELLER', 'ADMIN'),
  validate({ body: shopUpdateBody }),
  shopController.updateMine,
);

// Admin edits any shop.
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: idParam, body: shopAdminUpdateBody }),
  shopController.adminUpdate,
);

// Public shop page — keep last so it doesn't shadow /me.
router.get('/:slug', validate({ params: slugParam }), shopController.get);

export default router;
