import { Router } from 'express';
import { productController } from '../controllers/product.controller.js';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, productCreateBody, productUpdateBody, productListQuery } from '../middleware/schemas.js';

const router = Router();

// Public catalogue — no login required to browse, search or filter.
router.get('/', optionalAuth, validate({ query: productListQuery }), productController.list);
router.get('/facets', productController.facets);
router.get('/:id', optionalAuth, validate({ params: idParam }), productController.get);

// Authoring — a jeweller manages their own products; an admin manages any.
router.post(
  '/',
  authenticate,
  requireRole('JEWELLER', 'ADMIN'),
  validate({ body: productCreateBody }),
  productController.create,
);
router.patch(
  '/:id',
  authenticate,
  requireRole('JEWELLER', 'ADMIN'),
  validate({ params: idParam, body: productUpdateBody }),
  productController.update,
);
router.delete(
  '/:id',
  authenticate,
  requireRole('JEWELLER', 'ADMIN'),
  validate({ params: idParam }),
  productController.remove,
);

export default router;
