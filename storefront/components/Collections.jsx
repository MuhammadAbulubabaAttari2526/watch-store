import Link from 'next/link';
import Image from 'next/image';
import { Suspense } from 'react';
import { listCollections } from '@/lib/api/store';
import RetryButton from './RetryButton';

const featuredCollections = [
  { id: 'men', title: 'Men', description: 'Everyday elegance', href: '/products?category=men', image: '/images/collections/men-watch.jpg' },
  { id: 'women', title: 'Women', description: 'Timeless grace', href: '/products?category=women', image: '/images/collections/women-watch.jpg' },
  { id: 'luxury', title: 'Luxury', description: 'Crafted precision', href: '/products?collection=luxury', image: '/images/collections/luxury-watch.jpg' },
  { id: 'classic', title: 'Classic', description: 'Iconic style', href: '/products?collection=classic', image: '/images/collections/classic-watch.jpg' },
];

function imageForCollection(collection) {
  const key = `${collection.handle} ${collection.title}`.toLowerCase();
  if (/women|female|ladies/.test(key)) return featuredCollections[1].image;
  if (/\bmen|male/.test(key)) return featuredCollections[0].image;
  if (/lux|premium/.test(key)) return featuredCollections[2].image;
  if (/classic|vintage/.test(key)) return featuredCollections[3].image;
  return featuredCollections[2].image;
}

async function Body() {
  let data = [];
  let error;
  try { data = await listCollections(); }
  catch (e) { error = e; }
  const collections = data.length >= 4
    ? data.map((collection) => ({
      id: collection.id,
      title: collection.title,
      href: `/products?collection=${collection.handle}`,
      image: imageForCollection(collection),
      description: 'Explore the collection',
    }))
    : featuredCollections;

  return (
    <>
      {error && <div className="alert alert--error stack"><p>We could not load collections. {error.message}</p><RetryButton /></div>}
      <ul className="collection-grid">
        {collections.map((collection) => (
          <li key={collection.id}>
            <Link className="collection-tile" href={collection.href}>
              <Image className="collection-tile__image" src={collection.image} alt="" fill sizes="(min-width: 48em) 25vw, 50vw" unoptimized />
              <span className="collection-tile__shade" aria-hidden="true" />
              <span className="collection-tile__content">
                <span className="collection-tile__description">{collection.description}</span>
                <h3>{collection.title}</h3>
                <span className="collection-tile__cta">Discover collection <span aria-hidden="true">→</span></span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function Collections() {
  return (
    <section id="collections" className="section collections-section" aria-label="Shop by collection">
      <div className="container">
        <Suspense fallback={<div className="collection-grid" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}</div>}><Body /></Suspense>
      </div>
    </section>
  );
}
