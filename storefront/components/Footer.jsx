import Link from 'next/link';
import { whatsappUrl } from '@/lib/utils/format';

export default function Footer() {
  const wa = whatsappUrl();
  return (
    <footer className="site-footer theme-dark">
      <div className="container footer__main">
        <div className="footer__brand">
          <Link className="footer__logo" href="/">VELTRIX</Link>
          <p>Timeless style. Defining you.</p>
          <span className="footer__accent-line" aria-hidden="true" />
          <nav className="footer__social" aria-label="Social links">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 20l1.3-4.1A8 8 0 1 1 8.2 18.8L4 20z"/><path d="M9 9.5c.4 2 2.5 4 4.5 4.5l1.2-1.2-1.8-1-.8.6c-.8-.3-1.6-1.1-1.9-1.9l.6-.8-1-1.8L9 9.5z"/></svg>
              </a>
            )}
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/></svg>
            </a>
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-3.2 0-5 1.9-5 5v2H6v4h3v5h4v-5h3l1-4h-4V9c0-.7.3-1 1-1z"/></svg>
            </a>
            <a href="#" aria-label="YouTube">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 7.1a2.8 2.8 0 0 0-2-2C17.2 4.7 12 4.7 12 4.7s-5.2 0-7 .4a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2.6 12a29 29 0 0 0 .4 4.9 2.8 2.8 0 0 0 2 2c1.8.4 7 .4 7 .4s5.2 0 7-.4a2.8 2.8 0 0 0 2-2A29 29 0 0 0 21.4 12a29 29 0 0 0-.4-4.9zM10 15V9l5.2 3L10 15z"/></svg>
            </a>
            <a href="#" aria-label="X">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 4l14 16M19 4L5 20"/></svg>
            </a>
          </nav>
        </div>
        <div className="footer__nav-wrap">
          <nav className="footer__nav" aria-label="Footer">
            <Link href="/products">Shop <span>›</span></Link>
            <Link href="/#collections">Collections <span>›</span></Link>
            <Link href="/products?collection=best-sellers">Best sellers <span>›</span></Link>
            <Link href="/products?collection=new-arrivals">New arrivals <span>›</span></Link>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer">Chat on WhatsApp <span>›</span></a>}
          </nav>
        </div>
      </div>
      <div className="footer__bottom">
        <div className="container">&copy; {new Date().getFullYear()} VELTRIX. All rights reserved.</div>
      </div>
    </footer>
  );
}
