import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { publicUser } from '../utils/serialize.js';
import { hashPassword } from '../utils/password.js';
import { parsePagination, pageMeta } from '../utils/pagination.js';

// A fresh JewellerProfile needs a name + unique slug. The jeweller edits the
// real shop details later via PATCH /api/shops/me.
function shopScaffold(fullName, email) {
  const base = (fullName || email.split('@')[0])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'shop';
  return {
    shopName: fullName ? `${fullName}` : `${email.split('@')[0]}'s Shop`,
    slug: `${base}-${Math.random().toString(36).slice(2, 7)}`,
  };
}

/** Admin user management + self-service profile updates. */
export const userService = {
  async list(query = {}) {
    const { page, pageSize, skip, take, orderBy } = parsePagination(query, {
      allowedSort: ['email', 'role', 'createdAt'],
    });
    const where = {};
    if (query.role) where.role = query.role;
    if (query.q) {
      where.OR = [
        { email: { contains: String(query.q), mode: 'insensitive' } },
        { fullName: { contains: String(query.q), mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { customerProfile: true, jewellerProfile: true },
      }),
      prisma.user.count({ where }),
    ]);
    return { data: rows.map(publicUser), meta: pageMeta(page, pageSize, total) };
  },

  async get(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { customerProfile: true, jewellerProfile: true },
    });
    if (!user) throw ApiError.notFound('user not found');
    return publicUser(user);
  },

  /** Admin creates a user with any role (used to onboard jewellers). */
  async adminCreate({ email, password, role = 'CUSTOMER', fullName, phone }) {
    const normalized = email.trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email: normalized } })) {
      throw ApiError.conflict('Email already in use');
    }
    const user = await prisma.user.create({
      data: {
        email: normalized,
        passwordHash: await hashPassword(password),
        role,
        fullName: fullName || null,
        phone: phone || null,
        ...(role === 'CUSTOMER' ? { customerProfile: { create: {} } } : {}),
        ...(role === 'JEWELLER'
          ? { jewellerProfile: { create: shopScaffold(fullName, normalized) } }
          : {}),
      },
      include: { customerProfile: true, jewellerProfile: true },
    });
    return publicUser(user);
  },

  async setRole(id, role) {
    if (!['CUSTOMER', 'JEWELLER', 'ADMIN'].includes(role)) {
      throw ApiError.badRequest('Invalid role');
    }
    const current = await prisma.user.findUnique({
      where: { id },
      include: { jewellerProfile: { select: { id: true } } },
    });
    if (!current) throw ApiError.notFound('user not found');
    const needsShop = role === 'JEWELLER' && !current.jewellerProfile;
    const user = await prisma.user.update({
      where: { id },
      data: {
        role,
        ...(needsShop
          ? { jewellerProfile: { create: shopScaffold(current.fullName, current.email) } }
          : {}),
      },
      include: { customerProfile: true, jewellerProfile: true },
    });
    return publicUser(user);
  },

  async setActive(id, isActive) {
    const user = await prisma.user.update({ where: { id }, data: { isActive: !!isActive } });
    if (!isActive) {
      await prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return publicUser(user);
  },

  async updateProfile(userId, { fullName, phone, customerProfile, jewellerProfile }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw ApiError.notFound('user not found');

    const data = {};
    if (fullName !== undefined) data.fullName = fullName;
    if (phone !== undefined) data.phone = phone;

    if (customerProfile && user.role === 'CUSTOMER') {
      data.customerProfile = { upsert: { create: customerProfile, update: customerProfile } };
    }
    if (jewellerProfile && user.role === 'JEWELLER') {
      data.jewellerProfile = { upsert: { create: jewellerProfile, update: jewellerProfile } };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      include: { customerProfile: true, jewellerProfile: true },
    });
    return publicUser(updated);
  },
};

export default userService;
