import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, listProducts } from '@/lib/api/store';
import { SITE_URL, SPEC_LABELS, whatsappUrl } from '@/lib/utils/format';
import ProductGallery from '@/components/ProductGallery';
import ProductPurchase from '@/components/ProductPurchase';
import ProductCard from '@/components/ProductCard';
import RecentlyViewed from '@/components/RecentlyViewed';

export const dynamic = 'force-dynamic';

async function load(handle) { try { return await getProduct(handle); } catch { return undefined; } }

export async function generateMetadata({ params }) {
  const p = await load(params.handle);
  if (!p) return { title: 'Watch not found | VELTRIX' };
  const description = (p.description || `${p.title} from VELTRIX, delivered across Pakistan.`).replace(/\s+/g, ' ').slice(0, 155);
  return {
    title: `${p.title} | VELTRIX`, description,
    alternates: { canonical: `/products/${p.handle}` },
    openGraph: { title: p.title, description, type: 'website', images: p.thumbnail ? [p.thumbnail] : undefined },
  };
}

export default async function ProductPage({ params }) {
  let product;
  try { product = await getProduct(params.handle); }
  catch (e) {
    return <section className="section"><div className="container"><div className="alert alert--error stack"><p>We could not load this watch. {e.message}</p><Link className="btn btn--ghost" href={`/products/${params.handle}`}>Try again</Link></div></div></section>;
  }
  if (!product) notFound();

  let related = [];
  try { related = (await listProducts({ limit: 5, collectionHandle: product.collection?.handle })).filter((p) => p.id !== product.id).slice(0, 4); } catch {}

  const images = product.images.length ? product.images : product.thumbnail ? [{ id: 't', url: product.thumbnail }] : [];
  const specs = Object.entries(SPEC_LABELS).filter(([k]) => product.metadata[k]).map(([k, label]) => [label, String(product.metadata[k])]);
  const warranty = product.metadata.warranty_period ? String(product.metadata.warranty_period) : null;
  const prices = product.variants.map((v) => v.price).filter((n) => n != null);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: product.title, description: product.description || undefined,
    image: images.map((i) => i.url), brand: { '@type': 'Brand', name: 'VELTRIX' },
    offers: prices.length ? {
      '@type': 'Offer', priceCurrency: 'PKR', price: Math.min(...prices), url: `${SITE_URL}/products/${product.handle}`,
      availability: product.variants.some((v) => v.available) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    } : undefined,
  };

  return (
    <section className="section pdp-section">
      <div className="container pdp-container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/products">Watches</Link>
          {product.collection && <><span aria-hidden="true">/</span><Link href={`/products?collection=${product.collection.handle}`}>{product.collection.title}</Link></>}
        </nav>
        <div className="pdp">
          <ProductGallery images={images} title={product.title} />
          <div className="pdp__info stack">
            <div className="pdp__eyebrow"><span aria-hidden="true" />{product.collection?.title || 'Premium collection'}</div>
            <h1>{product.title}</h1>
            {product.subtitle && <p className="pdp__subtitle">{product.subtitle}</p>}
            <ProductPurchase product={product} whatsapp={whatsappUrl('Hello VELTRIX, I would like to order.')} />
            <div className="pdp__trust" aria-label="Store benefits">
              <div><span className="pdp__trust-icon" aria-hidden="true">◇</span><p>Premium Quality</p></div>
              <div><span className="pdp__trust-icon" aria-hidden="true">▱</span><p>Free Shipping All Over Pakistan</p></div>
              <div><span className="pdp__trust-icon" aria-hidden="true">↶</span><p>7 Days Easy Return</p></div>
              <div><span className="pdp__trust-icon" aria-hidden="true">▣</span><p>Secure Payment</p></div>
            </div>
            <div className="pdp-tabs">
              <div className="pdp-tabs__labels" role="tablist" aria-label="Product details">
                <span className="is-active" role="tab" aria-selected="true">Description</span>
                <span role="tab" aria-selected="false">Specifications</span>
                <span role="tab" aria-selected="false">Reviews</span>
              </div>
              <div className="pdp-tabs__body">
                {product.description
                  ? <p className="pre">{product.description}</p>
                  : <p>Upgrade your style with the VELTRIX {product.title}. A perfect blend of classic design and modern elegance, crafted for those who value time.</p>}
                {specs.length > 0 && <dl className="specs pdp-specs">{specs.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>}
                {warranty && <p className="pdp-tabs__warranty">Warranty: {warranty}</p>}
              </div>
            </div>
          </div>
        </div>
        {related.length > 0 && (
          <div className="related">
            <div className="section-head"><h2 style={{ margin: 0 }}>You may also like</h2><hr className="tick-rule" /></div>
            <div className="product-grid">{related.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          </div>
        )}
        <RecentlyViewed current={{ handle: product.handle, title: product.title, thumbnail: product.thumbnail }} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </section>
  );
}
