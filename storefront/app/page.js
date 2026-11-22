import Hero from '@/components/Hero';
import Collections from '@/components/Collections';
import ProductRail from '@/components/ProductRail';
import BrandStory from '@/components/BrandStory';
import WhyChoose from '@/components/WhyChoose';
import Newsletter from '@/components/Newsletter';
import { listProducts } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <>
      <Hero />
      <Collections />
      <ProductRail id="featured" title="Featured watches" load={() => listProducts({ limit: 4 })}
        empty="No watches yet. Add products in Medusa Admin and they will appear here." />
      <ProductRail id="best-sellers" title="Best sellers" load={() => listProducts({ limit: 4, collectionHandle: 'best-sellers' })}
        empty="Add products to a collection with the handle best-sellers in Medusa Admin." />
      <ProductRail id="new-arrivals" title="New arrivals" load={() => listProducts({ limit: 4, collectionHandle: 'new-arrivals' })}
        empty="Add products to a collection with the handle new-arrivals in Medusa Admin." />
      <BrandStory />
      <WhyChoose />
      <Newsletter />
    </>
  );
}
