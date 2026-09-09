import { z } from 'zod';
import {
  PRODUCT_AVAILABILITY,
  APPOINTMENT_SERVICE_TYPE,
  APPOINTMENT_STATUS,
  ORDER_STATUS,
} from '../../../shared/constants.js';

export const idParam = z.object({ id: z.string().min(1) });
export const slugParam = z.object({ slug: z.string().min(1).max(120) });

const listQueryBase = {
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  sort: z.string().max(40).optional(),
  q: z.string().max(120).optional(),
  mine: z.enum(['true', 'false']).optional(),
};
export const listQuery = (extra = {}) => z.object({ ...listQueryBase, ...extra });

const money = z.coerce.number().nonnegative().max(1_000_000_000);
const shortText = z.string().trim().max(120);
const longText = z.string().trim().max(4000);

// ── auth ────────────────────────────────────────────────────────────────────
export const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  fullName: shortText.optional(),
  phone: z.string().trim().max(40).optional(),
});
export const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});
export const forgotBody = z.object({ email: z.string().email() });
export const resetBody = z.object({
  token: z.string().min(10).max(400),
  newPassword: z.string().min(8).max(200),
});
export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});
export const profileBody = z.object({
  fullName: shortText.optional(),
  phone: z.string().trim().max(40).optional(),
  customerProfile: z
    .object({
      address: z.string().trim().max(500).optional(),
      phone: z.string().trim().max(40).optional(),
    })
    .optional(),
});

// ── users (admin) ───────────────────────────────────────────────────────────
export const adminCreateUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  role: z.enum(['CUSTOMER', 'JEWELLER', 'ADMIN']),
  fullName: shortText.optional(),
  phone: z.string().trim().max(40).optional(),
});
export const setRoleBody = z.object({ role: z.enum(['CUSTOMER', 'JEWELLER', 'ADMIN']) });
export const setActiveBody = z.object({ isActive: z.boolean() });

// ── categories ──────────────────────────────────────────────────────────────
export const categoryCreateBody = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_]+$/, 'UPPER_SNAKE_CASE'),
  name: shortText,
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, 'kebab-case'),
  folder: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'a jewellery-images/ subfolder name'),
  description: longText.optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});
export const categoryUpdateBody = categoryCreateBody.partial().omit({ code: true });

// ── products ────────────────────────────────────────────────────────────────
const productImageInput = z.object({
  path: z.string().trim().min(1).max(200),
  alt: shortText.optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export const productCreateBody = z.object({
  name: shortText,
  categoryId: z.string().min(1),
  jewellerId: z.string().min(1).optional(), // ADMIN may set; a JEWELLER is forced to self
  description: longText.optional(),
  metal: shortText.optional(),
  purity: shortText.optional(),
  weightGrams: z.coerce.number().nonnegative().max(100000).optional(),
  stone: shortText.optional(),
  price: money,
  currency: z.string().trim().length(3).toUpperCase().optional(),
  stock: z.coerce.number().int().min(0).max(1_000_000).optional(),
  availability: z.enum(PRODUCT_AVAILABILITY).optional(),
  isPublished: z.boolean().optional(),
  images: z.array(productImageInput).max(12).optional(),
});
export const productUpdateBody = productCreateBody.partial();

export const productListQuery = listQuery({
  category: z.string().max(60).optional(), // slug or id
  shop: z.string().max(120).optional(), // slug or jewellerId
  metal: z.string().max(60).optional(),
  purity: z.string().max(60).optional(),
  stone: z.string().max(60).optional(),
  availability: z.enum(PRODUCT_AVAILABILITY).optional(),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().nonnegative().optional(),
  weightMin: z.coerce.number().nonnegative().optional(),
  weightMax: z.coerce.number().nonnegative().optional(),
  all: z.enum(['0', '1']).optional(),
});

// ── shops (jeweller profile) ────────────────────────────────────────────────
export const shopUpdateBody = z.object({
  shopName: shortText.optional(),
  description: longText.optional(),
  logoPath: z.string().trim().max(300).optional(),
  addressLine1: shortText.optional(),
  addressLine2: shortText.optional(),
  city: shortText.optional(),
  region: shortText.optional(),
  postalCode: z.string().trim().max(20).optional(),
  country: shortText.optional(),
  phone: z.string().trim().max(40).optional(),
  email: z.string().email().optional().or(z.literal('')),
  openingHours: z.record(z.string().max(40)).optional(),
  appointmentSlots: z.record(z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(48)).optional(),
  active: z.boolean().optional(),
});
export const shopAdminUpdateBody = shopUpdateBody.extend({ verified: z.boolean().optional() });

// ── cart ────────────────────────────────────────────────────────────────────
export const cartItemBody = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(50),
});
export const cartItemPatchBody = z.object({
  quantity: z.coerce.number().int().min(0).max(50),
});

// ── orders ──────────────────────────────────────────────────────────────────
export const checkoutBody = z.object({
  contactName: shortText,
  contactPhone: z.string().trim().min(4).max(40),
  shippingAddress: z.object({
    line1: shortText,
    line2: shortText.optional(),
    city: shortText,
    region: shortText.optional(),
    postalCode: z.string().trim().max(20),
    country: shortText,
  }),
});
export const orderStatusBody = z.object({ status: z.enum(ORDER_STATUS) });

// ── appointments ────────────────────────────────────────────────────────────
export const appointmentCreateBody = z.object({
  jewellerId: z.string().min(1),
  productId: z.string().min(1).optional(),
  serviceType: z.enum(APPOINTMENT_SERVICE_TYPE).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  timeSlot: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
  customerName: shortText,
  customerPhone: z.string().trim().min(4).max(40),
  notes: longText.optional(),
});
export const appointmentUpdateBody = z.object({
  status: z.enum(APPOINTMENT_STATUS).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  timeSlot: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  notes: longText.optional(),
});
export const appointmentAvailabilityQuery = z.object({
  jewellerId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ── inventory ───────────────────────────────────────────────────────────────
export const inventoryCreateBody = z.object({
  sku: z.string().trim().min(1).max(60),
  name: shortText,
  category: shortText.optional(),
  material: shortText.optional(),
  quantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
  unitCost: money.optional(),
  reorderLevel: z.coerce.number().int().min(0).max(1_000_000).optional(),
  location: shortText.optional(),
});
export const inventoryUpdateBody = inventoryCreateBody.partial();
