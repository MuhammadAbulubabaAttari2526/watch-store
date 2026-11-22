import { getSupabaseBrowser } from '@/lib/supabase/client';
import { toCart } from './mappers';

export const createCart = () => ({ id: crypto.randomUUID(), items: [], discount: null });
export const optionPrice = (option) => option.amount ?? option.price ?? null;

function mapCart(cart) {
  return toCart(cart);
}

async function getVariant(variantId) {
  const { data, error } = await getSupabaseBrowser()
    .from('product_variants')
    .select('id,title,price,sale_price,is_active,inventory(quantity),product:products!inner(title,slug,status,product_images(url,position))')
    .eq('id', variantId)
    .eq('product.status', 'PUBLISHED')
    .maybeSingle();
  if (error) throw new Error(`Could not check product availability: ${error.message}`);
  if (!data || !data.is_active) throw new Error('This watch is no longer available.');
  const inventory = Array.isArray(data.inventory) ? data.inventory[0] : data.inventory;
  const product = data.product;
  const images = (product.product_images || []).slice().sort((a, b) => a.position - b.position);
  return {
    id: data.id,
    title: data.title,
    price: Number(data.price),
    salePrice: data.sale_price == null ? null : Number(data.sale_price),
    inventory: { quantity: inventory?.quantity || 0 },
    product: { title: product.title, slug: product.slug, images },
  };
}

export async function addItem(cart, variantId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Choose a valid quantity.');
  const variant = await getVariant(variantId);
  const current = cart.items.find((item) => item.variantId === variantId);
  const nextQuantity = (current?.quantity || 0) + quantity;
  if (nextQuantity > variant.inventory.quantity) throw new Error('There is not enough stock for that quantity.');
  const unitPrice = variant.salePrice ?? variant.price;
  const item = { id: variantId, variantId, quantity: nextQuantity, unitPrice, variant };
  const items = current
    ? cart.items.map((line) => line.variantId === variantId ? item : line)
    : [...cart.items, item];
  return mapCart({ ...cart, items });
}

export async function updateItem(cart, variantId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Choose a valid quantity.');
  const item = cart.items.find((line) => line.variantId === variantId);
  if (!item) throw new Error('This cart item is no longer available.');
  const variant = await getVariant(variantId);
  if (quantity > variant.inventory.quantity) throw new Error('There is not enough stock for that quantity.');
  return mapCart({
    ...cart,
    items: cart.items.map((line) => line.variantId === variantId
      ? { ...line, quantity, unitPrice: variant.salePrice ?? variant.price, variant }
      : line),
  });
}

export function removeItem(cart, variantId) {
  return mapCart({ ...cart, items: cart.items.filter((item) => item.variantId !== variantId) });
}

export async function applyDiscount(cart, code) {
  const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const { data, error } = await getSupabaseBrowser().rpc('validate_discount', {
    p_code: code,
    p_subtotal: subtotal,
  });
  if (error) throw new Error(error.message.includes('That discount code is not valid')
    ? 'That discount code is not valid.'
    : `Could not validate discount: ${error.message}`);
  return mapCart({ ...cart, discount: data });
}

export function removeDiscount(cart) {
  return mapCart({ ...cart, discount: null });
}

export async function listShippingOptions(city) {
  const { data, error } = await getSupabaseBrowser()
    .from('store_settings')
    .select('key,value')
    .in('key', ['shipping_karachi', 'shipping_nationwide']);
  if (error) throw new Error(`Could not load delivery options: ${error.message}`);
  const rates = Object.fromEntries((data || []).map(({ key, value }) => [key, Number(value)]));
  const options = [
    { id: 'karachi', name: 'Karachi Delivery', amount: rates.shipping_karachi },
    { id: 'nationwide', name: 'Nationwide Delivery', amount: rates.shipping_nationwide },
  ].filter((option) => Number.isFinite(option.amount) && option.amount >= 0);
  const normalizedCity = String(city || '').trim().toLowerCase();
  return normalizedCity
    ? options.filter((option) => option.id === (normalizedCity.includes('karachi') ? 'karachi' : 'nationwide'))
    : options;
}
