/**
 * Constants shared in spirit by both client and server. The server (Prisma
 * enums) is the source of truth; the client imports the plain values for labels
 * and guards. Keep in sync with server/prisma/schema.prisma.
 */

export const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  JEWELLER: 'JEWELLER',
  ADMIN: 'ADMIN',
});

export const PRODUCT_AVAILABILITY = Object.freeze([
  'IN_STOCK',
  'MADE_TO_ORDER',
  'UNAVAILABLE',
]);

export const ORDER_STATUS = Object.freeze([
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'READY',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

// Allowed forward transitions. CANCELLED is reachable from any pre-SHIPPED state
// (handled in the order service, not listed here).
export const ORDER_STATUS_FLOW = Object.freeze({
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['READY', 'CANCELLED'],
  READY: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
});

export const PAYMENT_STATUS = Object.freeze(['PENDING', 'PAID', 'REFUNDED', 'FAILED']);

export const APPOINTMENT_SERVICE_TYPE = Object.freeze([
  'CONSULTATION',
  'VIEWING',
  'FITTING',
  'VALUATION',
  'OTHER',
]);

export const APPOINTMENT_STATUS = Object.freeze([
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
]);

export const DEFAULT_CURRENCY = 'INR';

// The jewellery classification folders under repo-root `jewellery-images/`.
// A category's `folder` must be one of these; products in that category may only
// use images from the matching folder.
export const JEWELLERY_IMAGE_FOLDERS = Object.freeze([
  'rings',
  'earrings',
  'necklaces',
  'bangles',
  'bracelets',
  'bridal',
]);
