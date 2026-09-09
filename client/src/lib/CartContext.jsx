import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';

const CartContext = createContext(null);

const EMPTY = { items: [], itemCount: 0, subtotal: 0, currency: 'INR', hasBlockingIssue: false };

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || user.role !== 'CUSTOMER') {
      setCart(EMPTY);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.cart.get();
      setCart(data);
    } catch {
      setCart(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(async (productId, quantity = 1) => {
    const { data } = await api.cart.addItem(productId, quantity);
    setCart(data);
    return data;
  }, []);

  const setQuantity = useCallback(async (productId, quantity) => {
    const { data } = await api.cart.setQuantity(productId, quantity);
    setCart(data);
    return data;
  }, []);

  const clear = useCallback(async () => {
    const { data } = await api.cart.clear();
    setCart(data);
    return data;
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, refresh, add, setQuantity, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within <CartProvider>');
  return ctx;
}

export default CartContext;
