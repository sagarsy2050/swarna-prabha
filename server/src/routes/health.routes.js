import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { health } from '../services/health.service.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const deep = req.query.deep === '1' || req.query.deep === 'true';
    const result = await health({ deep });
    res.status(result.status === 'ok' ? 200 : 503).json(result);
  }),
);

export default router;
