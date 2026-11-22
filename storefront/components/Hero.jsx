import Dial from './Dial';

export default function Hero() {
  return (
    <section className="hero theme-dark">
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="hero__eyebrow">Precision in every second</p>
          <h1>TIMELESS STYLE. DEFINING YOU.</h1>
          <p>Watches with a classic Swiss spirit, delivered across Pakistan.</p>
          <a className="btn btn--gold hero__cta" href="/products">
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
