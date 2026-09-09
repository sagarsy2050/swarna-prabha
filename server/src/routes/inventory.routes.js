import { Router } from 'express';
import { restController } from '../controllers/rest.js';
import { inventoryService } from '../services/simpleServices.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam, inventoryCreateBody, inventoryUpdateBody } from '../middleware/schemas.js';

const router = Router();
const ctl = restController(inventoryService);

router.use(authenticate, requireRole('JEWELLER', 'ADMIN'));

router.get('/', ctl.list);
router.get('/:id', validate({ params: idParam }), ctl.get);
router.post('/', validate({ body: inventoryCreateBody }), ctl.create);
router.patch('/:id', validate({ params: idParam, body: inventoryUpdateBody }), ctl.update);
router.delete('/:id', validate({ params: idParam }), ctl.remove);

export default router;
