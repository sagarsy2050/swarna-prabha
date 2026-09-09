import { Router } from 'express';
import { categoryController } from '../controllers/category.controller.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, categoryCreateBody, categoryUpdateBody } from '../middleware/schemas.js';

const router = Router();

// Public — the category picker on the storefront.
router.get('/', optionalAuth, categoryController.list);
router.get('/:id', validate({ params: idParam }), categoryController.get);

// The approved image filenames for a category's folder (admin/jeweller picker).
router.get(
  '/:id/images',
  authenticate,
  requireRole('JEWELLER', 'ADMIN'),
  validate({ params: idParam }),
  categoryController.images,
);

// Category management — admin only.
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate({ body: categoryCreateBody }),
  categoryController.create,
);
router.patch(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: idParam, body: categoryUpdateBody }),
  categoryController.update,
);
router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate({ params: idParam }),
  categoryController.remove,
);

export default router;
