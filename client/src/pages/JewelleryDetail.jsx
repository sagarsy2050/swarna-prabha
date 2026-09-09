import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ShoppingBag, Check } from 'lucide-react';
import { api } from '@/api/client';
import { PageLoader, ErrorState } from '@/components/Loading';
import ProductImage from '@/components/jewellery/ProductImage';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import { formatMoney } from '@/lib/utils';

function Spec({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex justify-between py-2 border-b border-neutral-100 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-900">{value}</span>
    </div>
  );
}

export default function JewelleryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { add } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(0);
  const [cartState, setCartState] = useState('idle'); // idle | adding | added | error
  const [cartMsg, setCartMsg] = useState('');

  const load = () => {
    setLoading(true);
    setError(null);
    api.catalog
      .get(id)
      .then((r) => {
        setProduct(r.data);
        setActive(0);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  };
  useEffect(load, [id]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorState error={error} onRetry={load} />;
  if (!product) return null;

  const images = product.imageUrls?.length ? product.imageUrls : [product.primaryImage].filter(Boolean);
  const outOfStock =
    product.availability === 'UNAVAILABLE' ||
    (product.availability === 'IN_STOCK' && product.stock === 0);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <Link to="/catalog" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to the collection
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <ProductImage
            image={images[active]}
            alt={product.name}
            ratio="aspect-square"
            className="rounded-3xl border border-neutral-200"
          />
          {images.length > 1 && (
            <div className="flex gap-2 mt-3">
              {images.map((img, i) => (
                <button
                  key={img.path || i}
                  onClick={() => setActive(i)}
                  className={`w-16 rounded-lg overflow-hidden border-2 ${i === active ? 'border-neutral-900' : 'border-transparent'}`}
                >
                  <ProductImage image={img} alt="" ratio="aspect-square" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-gold-700">
            {product.category?.name}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl text-neutral-900 mt-1">{product.name}</h1>
          <p className="font-display text-2xl text-neutral-900 mt-3">
            {formatMoney(product.price, product.currency)}
          </p>

          <p className="mt-2 text-sm">
            {outOfStock ? (
              <span className="text-destructive">Currently unavailable</span>
            ) : product.availability === 'MADE_TO_ORDER' ? (
              <span className="text-neutral-600">Made to order</span>
            ) : (
              <span className="text-emerald-700">In stock</span>
            )}
          </p>

          {product.description && (
            <p className="mt-5 text-neutral-600 leading-relaxed">{product.description}</p>
          )}

          <div className="mt-6">
            <Spec label="Jewellery type" value={product.category?.name} />
            <Spec label="Metal" value={product.metal} />
            <Spec label="Purity" value={product.purity} />
            <Spec label="Weight" value={product.weightGrams ? `${product.weightGrams} g` : null} />
            <Spec label="Stone" value={product.stone || 'None'} />
          </div>

          {product.shop && (
            <div className="mt-6 text-sm text-neutral-600">
              Sold by{' '}
              <Link to={`/shops/${product.shop.slug}`} className="text-gold-700 underline">
                {product.shop.name}
              </Link>
              {product.shop.city ? `, ${product.shop.city}` : ''}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              disabled={outOfStock || cartState === 'adding'}
              onClick={async () => {
                if (!user) {
                  navigate(`/login?returnTo=${encodeURIComponent(`/product/${product.id}`)}`);
                  return;
                }
                if (user.role !== 'CUSTOMER') {
                  setCartState('error');
                  setCartMsg('Only customer accounts can shop.');
                  return;
                }
                setCartState('adding');
                try {
                  await add(product.id, 1);
                  setCartState('added');
                  setCartMsg('');
                } catch (e) {
                  setCartState('error');
                  setCartMsg(e.message || 'Could not add to cart');
                }
              }}
              className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-6 py-3 text-sm hover:bg-neutral-800 disabled:opacity-40"
            >
              {cartState === 'added' ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              {cartState === 'adding' ? 'Adding…' : cartState === 'added' ? 'Added to cart' : 'Add to cart'}
            </button>
            {cartState === 'added' && (
              <Link
                to="/cart"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm hover:border-neutral-400"
              >
                View cart
              </Link>
            )}
            <Link
              to={`/book?shop=${product.shop?.slug || ''}${product.id ? `&product=${product.id}` : ''}`}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-6 py-3 text-sm hover:border-neutral-400"
            >
              <Calendar className="w-4 h-4" /> Book an appointment
            </Link>
          </div>
          {cartMsg && <p className="mt-3 text-xs text-destructive">{cartMsg}</p>}
        </div>
      </div>
    </div>
  );
}
