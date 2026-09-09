/**
 * Parse `?page=&pageSize=&sort=` into Prisma `skip/take/orderBy`.
 * `sort` is `field` (asc) or `-field` (desc); only whitelisted fields are honoured.
 */
export function parsePagination(query = {}, { allowedSort = [], defaultSort = '-createdAt', maxPageSize = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, Number.parseInt(query.pageSize, 10) || 20),
  );

  const raw = (query.sort || defaultSort).toString();
  const desc = raw.startsWith('-');
  const field = desc ? raw.slice(1) : raw;
  const allow = new Set([...allowedSort, 'createdAt', 'updatedAt']);
  const orderBy = allow.has(field)
    ? { [field]: desc ? 'desc' : 'asc' }
    : { createdAt: 'desc' };

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize, orderBy };
}

export function pageMeta(page, pageSize, total) {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export default { parsePagination, pageMeta };
