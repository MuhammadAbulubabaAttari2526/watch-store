import { afterEach, describe, expect, it, vi } from 'vitest';
import { request } from '@/lib/api/client';
import { listProducts, searchProducts } from '@/lib/api/store';
import { toCart, toProduct } from '@/lib/api/mappers';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('store API client', () => {
  it('sends product filters as query parameters to the configured API', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [{ id: 'watch-1', slug: 'classic-watch', title: 'Classic Watch' }], total: 1, page: 1, pages: 1 }),
    }));

    const products = await listProducts({ limit: 6, category: 'classic' });
    expect(products[0]).toMatchObject({ id: 'watch-1', handle: 'classic-watch', title: 'Classic Watch' });
    const [url] = fetch.mock.calls[0];
    expect(new URL(url).origin).toBe('https://api.example.test');
    expect(new URL(url).pathname).toBe('/api/products');
    expect(new URL(url).searchParams.get('limit')).toBe('6');
    expect(new URL(url).searchParams.get('category')).toBe('classic');
  });

  it('maps custom backend product, variant, image, and collection fields for the storefront', () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
    const product = toProduct({
      id: 'watch-1',
      slug: 'classic-watch',
      title: 'Classic Watch',
      brand: 'VELTRIX',
      caseMaterial: 'Steel',
      images: [{ id: 'image-1', url: '/uploads/watch.jpg' }],
      collections: [{ id: 'collection-1', name: 'Classics', slug: 'classics' }],
      variants: [{
        id: 'variant-1',
        title: 'Steel',
        price: '45000',
        salePrice: '36000',
        options: { strap: 'Steel', color: 'Black' },
        inventory: { quantity: 2 },
      }],
    });

    expect(product).toMatchObject({
      handle: 'classic-watch',
      subtitle: 'VELTRIX',
      thumbnail: 'https://api.example.test/uploads/watch.jpg',
      price: 36000,
      original: 45000,
      discount: 20,
      collection: { handle: 'classics', title: 'Classics' },
      metadata: { case_material: 'Steel' },
      options: [{ id: 'strap', title: 'Strap', values: ['Steel'] }, { id: 'color', title: 'Color', values: ['Black'] }],
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

  it('passes storefront search, price, and option filters to the custom API', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [], total: 0, page: 1, pages: 0 }),
    }));

    await searchProducts({ q: 'classic', sort: 'price-asc', min: 10000, max: 50000, color: 'Gold', strap: 'Steel' });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.get('search')).toBe('classic');
    expect(url.searchParams.get('sort')).toBe('price-asc');
    expect(url.searchParams.get('min')).toBe('10000');
    expect(url.searchParams.get('max')).toBe('50000');
    expect(url.searchParams.get('color')).toBe('Gold');
    expect(url.searchParams.get('strap')).toBe('Steel');
  });

  it('fails clearly when no API URL is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    await expect(request('/api/products')).rejects.toThrow(/NEXT_PUBLIC_API_URL/);
  });

  it('preserves the HTTP status when the API returns an error', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'https://api.example.test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Unavailable' }),
    }));

    await expect(request('/api/products')).rejects.toMatchObject({ message: 'Unavailable', status: 503 });
  });
});
