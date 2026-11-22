import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, from } = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: () => ({ rpc, from }),
}));

import { searchProducts } from '@/lib/api/store';
import { toCart, toOrder, toProduct } from '@/lib/api/mappers';
import { formatPrice } from '@/lib/utils/format';

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  rpc.mockReset();
  from.mockReset();
});

describe('Supabase store data access', () => {
  it('passes storefront filters to the product search RPC and maps its product rows', async () => {
    rpc.mockResolvedValue({
      data: {
        items: [{
          id: 'watch-1',
          slug: 'classic-watch',
          title: 'Classic Watch',
          brand: 'VELTRIX',
          case_material: 'Steel',
          images: [{ id: 'image-1', url: 'https://storage.example.test/watch.jpg', position: 0 }],
          collections: [{ id: 'collection-1', name: 'Classics', slug: 'classics' }],
          variants: [{
            id: 'variant-1',
            title: 'Steel',
            price: 45000,
            salePrice: 36000,
            isActive: true,
            options: { strap: 'Steel', color: 'Black' },
            inventory: { quantity: 2 },
          }],
        }],
        total: 1,
        page: 1,
        pages: 1,
      },
      error: null,
    });

    const result = await searchProducts({
      q: 'classic', sort: 'price-asc', min: 10000, max: 50000, color: 'Gold', strap: 'Steel',
    });

    expect(rpc).toHaveBeenCalledWith('search_products', {
      p_page: 1,
      p_limit: 12,
      p_search: 'classic',
      p_category: null,
      p_collection: null,
      p_min: 10000,
      p_max: 50000,
      p_color: 'Gold',
      p_strap: 'Steel',
      p_sort: 'price-asc',
    });
    expect(result.items[0]).toMatchObject({
      id: 'watch-1',
      handle: 'classic-watch',
      subtitle: 'VELTRIX',
      thumbnail: 'https://storage.example.test/watch.jpg',
      price: 36000,
      original: 45000,
      collection: { handle: 'classics', title: 'Classics' },
      metadata: { case_material: 'Steel' },
      variants: [{ id: 'variant-1', price: 36000, original: 45000, quantity: 2, available: true }],
    });
  });

  it('maps cart item prices and applied discounts for the storefront summary', () => {
    const cart = toCart({
      id: 'cart-1',
      items: [{
        id: 'line-1',
        quantity: 2,
        unitPrice: '1000',
        variant: { id: 'variant-1', title: 'Default', product: { title: 'Watch', slug: 'watch', images: [] } },
      }],
      discount: { id: 'discount-1', code: 'SAVE10', type: 'PERCENTAGE', value: '10' },
    });

    expect(cart).toMatchObject({
      id: 'cart-1',
      item_subtotal: 2000,
      discount_total: 200,
      total: 1800,
      promotions: [{ id: 'discount-1', code: 'SAVE10' }],
      items: [{ id: 'line-1', product_title: 'Watch', product_handle: 'watch', unit_price: 1000, total: 2000 }],
    });
  });

  it('reports database failures instead of returning an empty catalog', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    await expect(searchProducts()).rejects.toThrow('Could not search products: permission denied');
  });

  it('maps product variants and leaves absolute Supabase Storage URLs intact', () => {
    const product = toProduct({
      id: 'watch-1',
      slug: 'classic-watch',
      title: 'Classic Watch',
      images: [{ id: 'image-1', url: 'https://storage.example.test/watch.jpg' }],
      variants: [{
        id: 'variant-1',
        title: 'Steel',
        price: '45000',
        salePrice: '36000',
        isActive: true,
        options: { strap: 'Steel' },
        inventory: { quantity: 2 },
      }],
    });

    expect(product.thumbnail).toBe('https://storage.example.test/watch.jpg');
    expect(product.variants[0]).toMatchObject({ price: 36000, original: 45000, quantity: 2, available: true });
  });

  it('preserves order currencies and formats storefront prices with the configured unit', () => {
    const order = toOrder({
      orderNumber: 'VLX-260101-ABC123',
      currencyCode: 'USD',
      status: 'PENDING',
      subtotal: '2500',
      total: '2500',
      items: [],
      payments: [],
    });

    expect(order.currencyCode).toBe('USD');
    expect(formatPrice(2500, order.currencyCode)).toContain('$');
    expect(formatPrice(2500, 'PKR')).toBe('Rs 2,500');
  });
});
