import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount, currency = 'INR') {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Resolve an API-relative asset path (/jewellery-images/… or /uploads/…) to a full URL. */
export function assetUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  if (/^(https?:)?\/\//.test(pathOrUrl) || pathOrUrl.startsWith('data:')) return pathOrUrl;
  return `${API_BASE}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

export function formatDate(value, opts = { month: 'long', day: 'numeric', year: 'numeric' }) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString(undefined, opts);
}

export const titleCase = (s = '') => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
