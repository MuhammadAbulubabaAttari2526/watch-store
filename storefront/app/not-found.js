import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="section"><div className="container empty">
      <h1 style={{ fontSize: 'var(--fs-2xl)' }}>We could not find that page</h1>
      <p>The watch or page you opened may have been moved or removed.</p>
      <Link className="btn" href="/products">Browse all watches</Link>
    </div></section>
  );
}
