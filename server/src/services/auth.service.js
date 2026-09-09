import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiryDate,
} from '../utils/jwt.js';
import { publicUser } from '../utils/serialize.js';
import { getMailer } from '../integrations/mail/index.js';
import { config } from '../config/index.js';
import { logger } from '../lib/logger.js';

const RESET_TTL_MS = 60 * 60 * 1000; // 1h

async function issueSession(user, { userAgent, ip } = {}) {
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate(),
      userAgent: userAgent?.slice(0, 255),
      ip: ip?.slice(0, 64),
    },
  });
  return { accessToken: signAccessToken(user), refreshToken };
}

export const authService = {
  async register({ email, password, fullName }, meta = {}) {
    const normalized = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) throw ApiError.conflict('An account with that email already exists');

    // Public registration always creates a CUSTOMER. Elevated roles are granted
    // by an admin or the seed script — never self-assigned.
    const user = await prisma.user.create({
      data: {
        email: normalized,
        passwordHash: await hashPassword(password),
        fullName: fullName?.trim() || null,
        role: 'CUSTOMER',
        customerProfile: { create: {} },
      },
    });
    const session = await issueSession(user, meta);
    return { user: publicUser(user), ...session };
  },

  async login({ email, password }, meta = {}) {
    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    // Constant-ish work whether or not the user exists.
    const ok = user ? await verifyPassword(password, user.passwordHash) : false;
    if (!user || !ok) throw ApiError.unauthorized('Invalid email or password');
    if (!user.isActive) throw ApiError.forbidden('Account disabled');
    const session = await issueSession(user, meta);
    return { user: publicUser(user), ...session };
  },

  async refresh(refreshToken, meta = {}) {
    if (!refreshToken) throw ApiError.unauthorized('Missing refresh token');
    const tokenHash = hashToken(refreshToken);
    const record = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw ApiError.unauthorized('Refresh token invalid or expired');
    }
    if (!record.user.isActive) throw ApiError.forbidden('Account disabled');

    // Rotate: revoke the presented token, issue a fresh pair.
    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const session = await issueSession(record.user, meta);
    return { user: publicUser(record.user), ...session };
  },

  async logout(refreshToken) {
    if (!refreshToken) return;
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async logoutAll(userId) {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async me(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true, jewellerProfile: true },
    });
    if (!user) throw ApiError.notFound('User not found');
    return publicUser(user);
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw ApiError.badRequest('Current password is incorrect');
    }
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    });
    await authService.logoutAll(userId);
  },

  async forgotPassword(email) {
    const normalized = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    // Always behave as success — do not disclose whether the account exists.
    if (!user) return;
    const raw = crypto.randomBytes(32).toString('base64url');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + RESET_TTL_MS),
      },
    });
    const link = `${config.corsOrigins[0]}/reset-password?token=${raw}`;
    await getMailer().send({
      to: normalized,
      subject: 'Reset your Swarna Prabha password',
      text: `Use this link within 1 hour to reset your password:\n\n${link}\n\nIf you did not request this, ignore this email.`,
    });
    if (!config.isProd) logger.info(`[auth] password reset link for ${normalized}: ${link}`);
  },

  async resetPassword({ token, newPassword }) {
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw ApiError.badRequest('Reset link is invalid or has expired');
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await hashPassword(newPassword) },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  },
};

export default authService;
