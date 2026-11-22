'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '@/lib/api/cart';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);
const KEY = 'veltrix_cart_v2';
const read = () => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    return value && Array.isArray(value.items) ? value : null;
  } catch {
    return null;
  }
};

export default function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [shipFrom, setShipFrom] = useState(null);

  useEffect(() => {
    setCart(read());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      cart ? localStorage.setItem(KEY, JSON.stringify(cart)) : localStorage.removeItem(KEY);
    } catch (error) {
      setError(`Could not save your cart on this device: ${error.message}`);
    }
  }, [cart, ready]);

  const items = cart?.items || [];
  const count = items.reduce((n, i) => n + i.quantity, 0);

  // Delivery estimate: cheapest configured shipping option.
  useEffect(() => {
    if (items.length === 0) { setShipFrom(null); return; }
    let alive = true;
    api.listShippingOptions()
      .then((opts) => { const p = opts.map(api.optionPrice).filter((n) => n != null); if (alive) setShipFrom(p.length ? Math.min(...p) : null); })
      .catch((error) => { if (alive) { setShipFrom(null); setError(error.message); } });
    return () => { alive = false; };
  }, [count, items.length]);

  const run = useCallback(async (fn) => {
    setBusy(true); setError(null);
    try { const c = await fn(); if (c) setCart(c); return c; }
    catch (e) { setError(e.message); throw e; }
    finally { setBusy(false); }
  }, []);

  const value = useMemo(() => ({
    cart, items, count, ready, busy, error, open, shipFrom, setError,
    openDrawer: () => setOpen(true), closeDrawer: () => setOpen(false),
    setCartData: setCart,
    addItem: async (variantId, qty) => {
      const result = await run(() => api.addItem(cart || api.createCart(), variantId, qty));
      setOpen(true);
      return result;
    },
    updateItem: (line, qty) => run(() => qty <= 0
      ? api.removeItem(cart, line)
      : api.updateItem(cart, line, qty)),
    removeItem: (line) => run(() => api.removeItem(cart, line)),
    applyCoupon: (code) => run(() => api.applyDiscount(cart, code)),
    removeCoupon: () => run(() => api.removeDiscount(cart)),
    clearCart: () => setCart(null),
  }), [cart, items, count, ready, busy, error, open, shipFrom, run]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
