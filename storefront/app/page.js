import Hero from '@/components/Hero';
import Collections from '@/components/Collections';
import ProductRail from '@/components/ProductRail';
import BrandStory from '@/components/BrandStory';
import WhyChoose from '@/components/WhyChoose';
import Newsletter from '@/components/Newsletter';
import { listBanners, listProducts } from '@/lib/api/store';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const banners = await listBanners();
  return (
    <>
      <Hero banner={banners[0]} />
      <Collections />
      <ProductRail id="featured" title="Featured watches" load={() => listProducts({ limit: 4 })}
        empty="No featured watches are available yet." />
      <ProductRail id="best-sellers" title="Best sellers" load={() => listProducts({ limit: 4, collectionHandle: 'best-sellers' })}
        empty="No best sellers are available yet." />
      <ProductRail id="new-arrivals" title="New arrivals" load={() => listProducts({ limit: 4, collectionHandle: 'new-arrivals' })}
        empty="No new arrivals are available yet." />
      <BrandStory />
      <WhyChoose />
      <Newsletter />
    </>
  );
}
