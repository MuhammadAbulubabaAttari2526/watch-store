'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '@/lib/api/cart';

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);
const KEY = 'veltrix_cart_id';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} };

export default function CartProvider({ children }) {
  const [cart, setCart] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [shipFrom, setShipFrom] = useState(null);

  useEffect(() => {
    (async () => {
      const id = read();
      if (id) {
        try { const c = await api.getCart(id); c.completed_at ? write(null) : setCart(c); } catch { write(null); }
      }
      setReady(true);
    })();
  }, []);

  const items = cart?.items || [];
  const count = items.reduce((n, i) => n + i.quantity, 0);

  // Delivery estimate: cheapest configured shipping option.
  useEffect(() => {
    if (!cart?.id || items.length === 0) { setShipFrom(null); return; }
    let alive = true;
    api.listShippingOptions()
      .then((opts) => { const p = opts.map(api.optionPrice).filter((n) => n != null); if (alive) setShipFrom(p.length ? Math.min(...p) : null); })
      .catch(() => alive && setShipFrom(null));
    return () => { alive = false; };
  }, [cart?.id, count]);

  const run = useCallback(async (fn) => {
    setBusy(true); setError(null);
    try { const c = await fn(); if (c) setCart(c); return c; }
    catch (e) { setError(e.message); throw e; }
    finally { setBusy(false); }
  }, []);

  const ensure = useCallback(async () => {
    if (cart) return cart;
    const c = await api.createCart(); write(c.id); setCart(c); return c;
  }, [cart]);

  const value = useMemo(() => ({
    cart, items, count, ready, busy, error, open, shipFrom, setError,
    openDrawer: () => setOpen(true), closeDrawer: () => setOpen(false),
    setCartData: setCart,
    addItem: async (variantId, qty) => { const c = await run(async () => (await api.addItem((await ensure()).id, variantId, qty))); setOpen(true); return c; },
    updateItem: (line, qty) => run(() => (qty <= 0 ? api.removeItem(cart.id, line) : api.updateItem(cart.id, line, qty))),
    removeItem: (line) => run(() => api.removeItem(cart.id, line)),
    applyCoupon: (code) => run(async () => {
      return api.applyDiscount(cart.id, code);
    }),
    removeCoupon: () => run(() => api.removeDiscount(cart.id)),
    clearCart: () => { write(null); setCart(null); },
  }), [cart, items, count, ready, busy, error, open, shipFrom, run, ensure]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
