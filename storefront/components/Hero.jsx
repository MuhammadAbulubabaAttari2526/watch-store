import Dial from './Dial';

export default function Hero({ banner }) {
  return (
    <section className="hero theme-dark" style={banner?.imageUrl ? {
      backgroundImage: `linear-gradient(90deg, rgba(16, 16, 16, .94), rgba(16, 16, 16, .45)), url("${banner.imageUrl}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    } : undefined}>
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="hero__eyebrow">{banner?.title || 'Precision in every second'}</p>
          <h1>TIMELESS STYLE. DEFINING YOU.</h1>
          <p>Watches with a classic Swiss spirit, delivered across Pakistan.</p>
          <a className="btn btn--gold hero__cta" href={banner?.linkUrl || '/products'}>
            <span>Explore collection</span>
            <span className="hero__cta-arrow" aria-hidden="true">→</span>
          </a>
        </div>
        <Dial />
      </div>
      <div className="container"><hr className="tick-rule tick-rule--gold" /></div>
    </section>
  );
}
