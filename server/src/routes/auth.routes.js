import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerBody,
  loginBody,
  forgotBody,
  resetBody,
  changePasswordBody,
  profileBody,
} from '../middleware/schemas.js';

const router = Router();

// Tighter limiter on credential endpoints.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many attempts, try again later', code: 'RATE_LIMITED' } },
});

router.post('/register', authLimiter, validate({ body: registerBody }), authController.register);
router.post('/login', authLimiter, validate({ body: loginBody }), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, validate({ body: forgotBody }), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetBody }), authController.resetPassword);

router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate({ body: profileBody }), authController.updateProfile);
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordBody }),
  authController.changePassword,
);

export default router;
