'use client';

export default function Error({ reset }) {
  return (
    <section className="section"><div className="container empty">
      <h1 style={{ fontSize: 'var(--fs-2xl)' }}>Something went wrong</h1>
      <p>We could not show this page. Please try again in a moment.</p>
      <button className="btn" onClick={() => reset()}>Try again</button>
    </div></section>
  );
}
