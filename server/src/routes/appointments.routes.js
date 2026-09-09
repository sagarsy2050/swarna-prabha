import { Router } from 'express';
import { restController } from '../controllers/rest.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { appointmentService } from '../services/appointment.service.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  idParam,
  appointmentCreateBody,
  appointmentUpdateBody,
  appointmentAvailabilityQuery,
} from '../middleware/schemas.js';

const router = Router();
const ctl = restController(appointmentService);

// Public: which slots are open for a shop on a given day.
router.get(
  '/availability',
  optionalAuth,
  validate({ query: appointmentAvailabilityQuery }),
  asyncHandler(async (req, res) => res.json(await appointmentService.availability(req.query))),
);

router.use(authenticate);

router.get('/', ctl.list);
router.get('/:id', validate({ params: idParam }), ctl.get);
router.post('/', validate({ body: appointmentCreateBody }), ctl.create);
router.patch('/:id', validate({ params: idParam, body: appointmentUpdateBody }), ctl.update);
router.delete('/:id', validate({ params: idParam }), ctl.remove);

export default router;
