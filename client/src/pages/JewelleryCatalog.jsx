import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { PageLoader, ErrorState, Spinner } from '@/components/Loading';
import JewelleryCategorySelector from '@/components/jewellery/JewelleryCategorySelector';
import JewelleryFilters from '@/components/jewellery/JewelleryFilters';
import JewelleryGrid from '@/components/jewellery/JewelleryGrid';

const FILTER_KEYS = ['q', 'metal', 'purity', 'stone', 'availability', 'priceMin', 'priceMax', 'weightMin', 'weightMax'];

export default function JewelleryCatalog() {
  const { categorySlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);
  const [catsError, setCatsError] = useState(null);

  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [facets, setFacets] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  const filters = useMemo(() => {
    const f = {};
    for (const k of FILTER_KEYS) {
      const v = searchParams.get(k);
      if (v != null && v !== '') f[k] = k.includes('rice') || k.includes('eight') ? Number(v) : v;
    }
    return f;
  }, [searchParams]);
  const page = Number(searchParams.get('page') || 1);

  useEffect(() => {
    let alive = true;
    setCatsLoading(true);
    api.catalog
      .categories()
      .then((r) => alive && setCategories(r.data || []))
      .catch((e) => alive && setCatsError(e))
      .finally(() => alive && setCatsLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const activeCategory = categories.find((c) => c.slug === categorySlug) || null;

  const loadList = useCallback(() => {
    setListLoading(true);
    setListError(null);
    const query = { ...filters, page, pageSize: 12, sort: '-createdAt' };
    if (categorySlug) query.category = categorySlug;
    Promise.all([
      api.catalog.list(query),
      api.catalog.facets(categorySlug ? { category: categorySlug } : undefined),
    ])
      .then(([list, fac]) => {
        setProducts(list.data || []);
        setMeta(list.meta || null);
        setFacets(fac.data || null);
      })
      .catch(setListError)
      .finally(() => setListLoading(false));
  }, [filters, page, categorySlug]);

  useEffect(loadList, [loadList]);

  const setCategory = (slug) => {
    // Navigating to a path string already produces a URL with no query params.
    // Calling setSearchParams({}) here as well raced with (and overrode) this
    // navigation, so the category chip appeared to do nothing.
    navigate(slug ? `/catalog/${slug}` : '/catalog');
  };

  const patchFilters = (next) => {
    const sp = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      if (next[k] !== undefined && next[k] !== '' && next[k] !== null) sp.set(k, next[k]);
    }
    setSearchParams(sp);
  };
  const resetFilters = () => setSearchParams({});
  const goToPage = (p) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('page', String(p));
    setSearchParams(sp);
  };

  if (catsLoading) return <PageLoader />;
  if (catsError) return <ErrorState error={catsError} onRetry={() => window.location.reload()} />;

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 sm:py-16">
      <div className="mb-8">
        <p className="text-gold-700 text-xs tracking-[0.25em] uppercase mb-2">Swarna Prabha</p>
        <h1 className="font-display text-4xl sm:text-5xl text-neutral-900">
          {activeCategory ? activeCategory.name : 'The collection'}
        </h1>
        {activeCategory?.description && (
          <p className="text-neutral-600 mt-2 max-w-2xl">{activeCategory.description}</p>
        )}
      </div>

      <div className="mb-8">
        <JewelleryCategorySelector categories={categories} value={categorySlug} onChange={setCategory} />
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-8">
        <aside className="lg:sticky lg:top-24 h-max rounded-2xl bg-white border border-neutral-200 p-5">
          <JewelleryFilters facets={facets} value={filters} onChange={patchFilters} onReset={resetFilters} />
        </aside>

        <div>
          <div className="flex items-center justify-between mb-4 text-sm text-neutral-500">
            <span>{meta ? `${meta.total} piece${meta.total === 1 ? '' : 's'}` : ''}</span>
            {listLoading && <Spinner className="w-4 h-4" />}
          </div>

          {listError ? (
            <ErrorState error={listError} onRetry={loadList} />
          ) : (
            <>
              <JewelleryGrid
                products={products}
                emptyMessage={
                  Object.keys(filters).length
                    ? 'No jewellery matches these filters.'
                    : 'No jewellery available in this category.'
                }
              />
              {meta && meta.totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 mt-10">
                  <button
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    className="px-4 py-2 rounded-full border border-neutral-200 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-neutral-500">
                    Page {meta.page} of {meta.totalPages}
                  </span>
                  <button
                    disabled={page >= meta.totalPages}
                    onClick={() => goToPage(page + 1)}
                    className="px-4 py-2 rounded-full border border-neutral-200 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
