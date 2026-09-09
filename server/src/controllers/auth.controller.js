import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../services/auth.service.js';
import { userService } from '../services/user.service.js';
import { config } from '../config/index.js';
import { ttlToMs } from '../utils/jwt.js';

const REFRESH_COOKIE = 'jw_refresh';

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProd,
    // Cross-site (separate client/API origins on Render) needs SameSite=None.
    sameSite: config.isProd ? 'none' : 'lax',
    domain: config.cookieDomain,
    path: '/api/auth',
    maxAge: ttlToMs(config.jwt.refreshTtl),
  };
}

function sendSession(res, { user, accessToken, refreshToken }) {
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return { user, accessToken };
}

const meta = (req) => ({ userAgent: req.get('user-agent'), ip: req.ip });

export const authController = {
  register: asyncHandler(async (req, res) => {
    const result = await authService.register(req.body, meta(req));
    res.status(201).json({ data: sendSession(res, result) });
  }),

  login: asyncHandler(async (req, res) => {
    const result = await authService.login(req.body, meta(req));
    res.json({ data: sendSession(res, result) });
  }),

  refresh: asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const result = await authService.refresh(token, meta(req));
    res.json({ data: sendSession(res, result) });
  }),

  logout: asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    await authService.logout(token);
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    res.json({ data: { ok: true } });
  }),

  me: asyncHandler(async (req, res) => {
    const data = await authService.me(req.user.id);
    res.json({ data });
  }),

  updateProfile: asyncHandler(async (req, res) => {
    const data = await userService.updateProfile(req.user.id, req.body);
    res.json({ data });
  }),

  changePassword: asyncHandler(async (req, res) => {
    await authService.changePassword(req.user.id, req.body);
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: undefined });
    res.json({ data: { ok: true } });
  }),

  forgotPassword: asyncHandler(async (req, res) => {
    await authService.forgotPassword(req.body.email);
    res.json({ data: { ok: true } });
  }),

  resetPassword: asyncHandler(async (req, res) => {
    await authService.resetPassword(req.body);
    res.json({ data: { ok: true } });
  }),
};

export { REFRESH_COOKIE };
export default authController;
