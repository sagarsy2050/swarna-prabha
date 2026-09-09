import { Router } from 'express';
import { cartController } from '../controllers/order.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { cartItemBody, cartItemPatchBody } from '../middleware/schemas.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate, requireRole('CUSTOMER'));

router.get('/', cartController.get);
router.post('/items', validate({ body: cartItemBody }), cartController.addItem);
router.patch(
  '/items/:productId',
  validate({ params: z.object({ productId: z.string().min(1) }), body: cartItemPatchBody }),
  cartController.setQuantity,
);
router.delete('/', cartController.clear);

export default router;
