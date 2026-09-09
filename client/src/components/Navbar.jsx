import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Gem, Menu, X, LogOut, User, ShoppingBag } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';

const baseLinks = [
  { to: '/catalog', label: 'Jewellery' },
  { to: '/shops', label: 'Jewellers' },
];
const customerLinks = [
  { to: '/my-orders', label: 'Orders' },
  { to: '/appointments', label: 'Appointments' },
];
const jewellerLinks = [{ to: '/jeweller', label: 'Jeweller Dashboard' }];
const adminLinks = [{ to: '/admin', label: 'Admin' }];

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const { cart } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  const isCustomer = user?.role === 'CUSTOMER';
  const links = [
    ...baseLinks,
    ...(isCustomer ? customerLinks : []),
    ...(hasRole('JEWELLER', 'ADMIN') ? jewellerLinks : []),
    ...(hasRole('ADMIN') ? adminLinks : []),
  ];

  const isActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const CartLink = () =>
    isCustomer ? (
      <Link to="/cart" className="relative inline-flex items-center text-neutral-600 hover:text-neutral-900" aria-label="Cart">
        <ShoppingBag className="w-5 h-5" />
        {cart.itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-gold-600 text-white text-[10px] leading-none rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
            {cart.itemCount}
          </span>
        )}
      </Link>
    ) : null;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/85 backdrop-blur-md border-b border-neutral-200/70' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center shadow-sm">
            <Gem className="w-5 h-5 text-white" strokeWidth={1.5} />
          </span>
          <span className="font-display text-2xl tracking-wide text-neutral-900 leading-none">Swarna Prabha</span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm tracking-wide transition-colors ${
                isActive(l.to) ? 'text-gold-700' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <CartLink />
          {user ? (
            <>
              <Link to="/profile" className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
                <User className="w-4 h-4" />
                {user.fullName || user.email}
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-sm text-neutral-700 hover:text-neutral-900">
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-sm px-4 py-2 rounded-full bg-neutral-900 text-white hover:bg-neutral-800"
              >
                Create account
              </Link>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-4">
          <CartLink />
          <button className="p-2 text-neutral-700" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="md:hidden bg-white border-t border-neutral-200 px-5 py-4 space-y-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`block text-sm py-1 ${isActive(l.to) ? 'text-gold-700' : 'text-neutral-700'}`}
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-neutral-200 flex items-center gap-3">
            {user ? (
              <>
                <Link to="/profile" className="text-sm text-neutral-600">Profile</Link>
                <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-sm text-neutral-600">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-neutral-700">
                  Sign in
                </Link>
                <Link to="/register" className="text-sm px-4 py-2 rounded-full bg-neutral-900 text-white">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
