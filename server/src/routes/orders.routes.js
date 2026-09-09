import { Router } from 'express';
import { orderController } from '../controllers/order.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, checkoutBody, orderStatusBody } from '../middleware/schemas.js';

const router = Router();
router.use(authenticate);

// Customer checkout (cart → orders).
router.post('/', requireRole('CUSTOMER'), validate({ body: checkoutBody }), orderController.checkout);

// Customer sees their orders; jeweller sees their shop's; admin sees all.
router.get('/', orderController.list);
router.get('/:id', validate({ params: idParam }), orderController.get);

// Jeweller/admin advance the status.
router.patch(
  '/:id/status',
  requireRole('JEWELLER', 'ADMIN'),
  validate({ params: idParam, body: orderStatusBody }),
  orderController.setStatus,
);

export default router;
