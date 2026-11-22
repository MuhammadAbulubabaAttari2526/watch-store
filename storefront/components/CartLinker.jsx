'use client';
import { useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useCart } from './CartProvider';
import { linkCartAction } from '@/lib/auth/actions';

export default function CartLinker() {
  const customer = useAuth();
  const { cart } = useCart();
  const tried = useRef(new Set());
  useEffect(() => {
    if (!customer || !cart?.id || cart.customer_id === customer.id || tried.current.has(cart.id)) return;
    tried.current.add(cart.id);
    linkCartAction(cart.id);
  }, [customer, cart?.id, cart?.customer_id]);
  return null;
}
