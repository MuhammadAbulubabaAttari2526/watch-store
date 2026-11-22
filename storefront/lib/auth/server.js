// Server-only helpers keep the backend session token in an httpOnly cookie.
import { cookies } from 'next/headers';
import { request } from '@/lib/api/client';
import { toOrder } from '@/lib/api/mappers';

export const COOKIE = 'veltrix_customer';
export const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 };

export const getToken = () => cookies().get(COOKIE)?.value || null;

export const api = (method, path, options = {}) =>
  request(path, { ...options, method, token: options.token ?? getToken() });

const toAddress = (address) => ({
  ...address,
  address_name: address.label,
  first_name: address.firstName,
  last_name: address.lastName,
  address_1: address.addressLine1,
  address_2: address.addressLine2,
  postal_code: address.postalCode,
  is_default_shipping: address.isDefault,
});

export async function getCustomer() {
  if (!getToken()) return null;
  try {
    const { customer } = await api('GET', '/api/auth/me');
    return {
      ...customer,
      first_name: customer.firstName,
      last_name: customer.lastName,
      addresses: (customer.addresses || []).map(toAddress),
    };
  } catch (error) {
    if (error.status === 401 || error.status === 404) return null;
    throw error;
  }
}

export async function listOrders(page = 1, limit = 10) {
  const { orders = [] } = await api('GET', '/api/orders/me');
  const all = orders.map(toOrder);
  return {
    orders: all.slice((page - 1) * limit, page * limit),
    count: all.length,
    pages: Math.max(1, Math.ceil(all.length / limit)),
  };
}

export async function getOrder(id) {
  try { return toOrder((await api('GET', `/api/orders/me/${encodeURIComponent(id)}`)).order); }
  catch (error) { if (error.status === 404) return null; throw error; }
}
