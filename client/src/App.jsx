import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import ScrollToTop from '@/components/ScrollToTop';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';

import Home from '@/pages/Home';
import Login from '@/pages/Login';
import StaffLogin from '@/pages/StaffLogin';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import JewelleryCatalog from '@/pages/JewelleryCatalog';
import JewelleryDetail from '@/pages/JewelleryDetail';
import ComingSoon from '@/pages/ComingSoon';
import MyOrders from '@/pages/MyOrders';
import OrderDetail from '@/pages/OrderDetail';
import Appointments from '@/pages/Appointments';
import Profile from '@/pages/Profile';
import JewellerDashboard from '@/pages/JewellerDashboard';
import AdminDashboard from '@/pages/AdminDashboard';
import NotFound from '@/pages/NotFound';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={200}>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <ScrollToTop />
            <Routes>
              {/* Auth pages render without the app chrome */}
              <Route path="/login" element={<Login />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/catalog" element={<JewelleryCatalog />} />
                <Route path="/catalog/:categorySlug" element={<JewelleryCatalog />} />
                <Route path="/product/:id" element={<JewelleryDetail />} />
                <Route path="/design/:id" element={<Navigate to="/catalog" replace />} />

                {/* Phase 3 — routes reserved, honest placeholder until built */}
                <Route path="/shops" element={<ComingSoon />} />
                <Route path="/shops/:slug" element={<ComingSoon />} />
                <Route path="/cart" element={<ComingSoon />} />
                <Route path="/checkout" element={<ComingSoon />} />
                <Route path="/book" element={<ComingSoon />} />

                {/* Signed-in customers (and staff) */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/my-orders" element={<MyOrders />} />
                  <Route path="/my-orders/:id" element={<OrderDetail />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/profile" element={<Profile />} />
                </Route>

                {/* Staff areas — separate sign-in for shops & admins */}
                <Route element={<ProtectedRoute roles={['JEWELLER', 'ADMIN']} loginPath="/staff/login" />}>
                  <Route path="/jeweller" element={<JewellerDashboard />} />
                </Route>
                <Route element={<ProtectedRoute roles={['ADMIN']} loginPath="/staff/login" />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="/index.html" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
