import { prisma } from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { parsePagination, pageMeta } from '../utils/pagination.js';
import { serialize } from '../utils/serialize.js';

/**
 * Factory for a conventional resource service over a Prisma model. Domain
 * services compose or extend this instead of re-implementing CRUD 15×.
 *
 * options:
 *   model        Prisma model name (e.g. 'design')
 *   allowedSort  sortable field names
 *   include      default Prisma include
 *   ownerField   field holding the owning user id (e.g. 'customerId'); enables
 *                scopeToOwner() so non-admins only see/modify their own rows
 *   searchFields string fields matched by ?q=
 *   filterable   query keys copied verbatim into the Prisma where
 *   beforeCreate/beforeUpdate  async (data, ctx) => data   hooks for domain rules
 *   afterCreate/afterUpdate    async (record, ctx) => void
 */
export function createCrudService(options) {
  const {
    model,
    allowedSort = [],
    include,
    ownerField,
    // Roles that may list/read every row; everyone else is scoped to ownerField.
    staffRoles = ['ADMIN'],
    searchFields = [],
    filterable = [],
    beforeCreate = (d) => d,
    beforeUpdate = (d) => d,
    afterCreate = async () => {},
    afterUpdate = async () => {},
  } = options;

  const db = () => prisma[model];

  function buildWhere(query = {}, ctx = {}) {
    const where = {};
    if (query.q && searchFields.length) {
      where.OR = searchFields.map((f) => ({
        [f]: { contains: String(query.q), mode: 'insensitive' },
      }));
    }
    for (const key of filterable) {
      if (query[key] !== undefined && query[key] !== '') where[key] = query[key];
    }
    // Ownership scoping: staff roles see all rows; everyone else is limited to
    // their own. `?mine=true` forces own-only even for staff.
    if (ownerField && ctx.user) {
      const mineOnly = query.mine === 'true' || query.mine === true;
      const isStaff = staffRoles.includes(ctx.user.role);
      if (mineOnly || !isStaff || ctx.scopeToOwner) {
        where[ownerField] = ctx.user.id;
      }
    }
    return where;
  }

  return {
    model,

    async list(query = {}, ctx = {}) {
      const { page, pageSize, skip, take, orderBy } = parsePagination(query, {
        allowedSort,
      });
      const where = { ...buildWhere(query, ctx), ...(ctx.where || {}) };
      const [rows, total] = await Promise.all([
        db().findMany({ where, skip, take, orderBy, include }),
        db().count({ where }),
      ]);
      return { data: rows.map(serialize), meta: pageMeta(page, pageSize, total) };
    },

    async get(id, ctx = {}) {
      const row = await db().findUnique({ where: { id }, include });
      if (!row) throw ApiError.notFound(`${model} not found`);
      if (
        ownerField &&
        ctx.user &&
        !staffRoles.includes(ctx.user.role) &&
        row[ownerField] !== ctx.user.id
      ) {
        throw ApiError.forbidden('Not your record');
      }
      return serialize(row);
    },

    async create(data, ctx = {}) {
      let payload = { ...data };
      if (ownerField && ctx.user && payload[ownerField] === undefined) {
        payload[ownerField] = ctx.user.id;
      }
      payload = await beforeCreate(payload, ctx);
      const row = await db().create({ data: payload, include });
      await afterCreate(row, ctx);
      return serialize(row);
    },

    async update(id, data, ctx = {}) {
      const existing = await db().findUnique({ where: { id } });
      if (!existing) throw ApiError.notFound(`${model} not found`);
      if (
        ownerField &&
        ctx.user &&
        !staffRoles.includes(ctx.user.role) &&
        !ctx.allowNonOwnerUpdate &&
        existing[ownerField] !== ctx.user.id
      ) {
        throw ApiError.forbidden('Not your record');
      }
      const payload = await beforeUpdate({ ...data }, { ...ctx, existing });
      const row = await db().update({ where: { id }, data: payload, include });
      await afterUpdate(row, { ...ctx, existing });
      return serialize(row);
    },

    async remove(id, ctx = {}) {
      const existing = await db().findUnique({ where: { id } });
      if (!existing) throw ApiError.notFound(`${model} not found`);
      if (
        ownerField &&
        ctx.user &&
        !staffRoles.includes(ctx.user.role) &&
        existing[ownerField] !== ctx.user.id
      ) {
        throw ApiError.forbidden('Not your record');
      }
      await db().delete({ where: { id } });
      return { id };
    },
  };
}

export default createCrudService;
