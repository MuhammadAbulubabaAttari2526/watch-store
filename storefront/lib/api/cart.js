import { request } from './client';
import { toCart } from './mappers';

const cartPath = (id) => `/api/carts/${encodeURIComponent(id)}`;
const mappedCart = async (path, options) => toCart((await request(path, options)).cart);

export const createCart = async () => mappedCart('/api/carts', { method: 'POST', body: {} });
export const getCart = (id) => mappedCart(cartPath(id));
export const addItem = (id, variantId, quantity) =>
  mappedCart(`${cartPath(id)}/items`, { method: 'POST', body: { variantId, quantity } });
export const updateItem = (id, lineId, quantity) =>
  mappedCart(`${cartPath(id)}/items/${encodeURIComponent(lineId)}`, { method: 'PATCH', body: { quantity } });
export const removeItem = (id, lineId) =>
  mappedCart(`${cartPath(id)}/items/${encodeURIComponent(lineId)}`, { method: 'DELETE' });
export const applyDiscount = (id, code) =>
  mappedCart(`${cartPath(id)}/discount`, { method: 'POST', body: { code } });
export const removeDiscount = (id) =>
  mappedCart(`${cartPath(id)}/discount`, { method: 'DELETE' });
export const listShippingOptions = async () =>
  (await request('/api/shipping-options')).shippingOptions;
export const optionPrice = (option) => option.amount ?? option.price ?? null;
