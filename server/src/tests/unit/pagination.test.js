import { describe, it, expect } from 'vitest';
import { parsePagination, pageMeta } from '../../utils/pagination.js';
import { serialize } from '../../utils/serialize.js';

describe('parsePagination', () => {
  it('applies defaults', () => {
    const p = parsePagination({});
    expect(p).toMatchObject({ page: 1, pageSize: 20, skip: 0, take: 20 });
    expect(p.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('clamps pageSize and computes skip', () => {
    const p = parsePagination({ page: '3', pageSize: '500' });
    expect(p.pageSize).toBe(100);
    expect(p.skip).toBe(200);
  });

  it('honours whitelisted sort fields only', () => {
    expect(parsePagination({ sort: 'title' }, { allowedSort: ['title'] }).orderBy).toEqual({
      title: 'asc',
    });
    expect(parsePagination({ sort: '-title' }, { allowedSort: ['title'] }).orderBy).toEqual({
      title: 'desc',
    });
    expect(parsePagination({ sort: '-secret' }, { allowedSort: ['title'] }).orderBy).toEqual({
      createdAt: 'desc',
    });
  });

  it('pageMeta computes totalPages', () => {
    expect(pageMeta(1, 20, 45)).toEqual({ page: 1, pageSize: 20, total: 45, totalPages: 3 });
    expect(pageMeta(1, 20, 0).totalPages).toBe(1);
  });
});

describe('serialize', () => {
  it('coerces Decimal-like objects to numbers', () => {
    const fakeDecimal = { toFixed: () => '12.50', toNumber: () => 12.5 };
    expect(serialize({ price: fakeDecimal })).toEqual({ price: 12.5 });
  });

  it('turns Dates into ISO strings and walks arrays', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    expect(serialize([{ at: d }])).toEqual([{ at: '2026-01-01T00:00:00.000Z' }]);
  });
});
