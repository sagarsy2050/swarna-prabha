import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/AuthContext';

export default function Layout() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900">
      <Navbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-display text-xl text-neutral-900">Swarna Prabha</p>
          <div className="flex items-center gap-5 text-xs text-neutral-500 tracking-wide">
            {!user && (
              <Link to="/staff/login" className="hover:text-neutral-900">
                Shop &amp; Admin sign in
              </Link>
            )}
            <span>© {new Date().getFullYear()} Swarna Prabha · A jewellery marketplace.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
