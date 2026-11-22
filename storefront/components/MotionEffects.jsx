'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const MOTION_TARGETS = [
  'main > section',
  'main .hero__copy',
  'main .dial',
  'main .section-head',
  'main .collection-grid > li',
  'main .product-card',
  'main .brand-story__heading',
  'main .brand-story__copy',
  'main .why-item',
  'main .newsletter__heading',
  'main .newsletter__form',
  'main .filters',
  'main .gallery',
  'main .pdp__info',
  'main .cart-layout',
  'main .checkout',
  'main .auth',
  'main .confirm',
  'main .account__nav',
  'main .box',
  'main .orders__row',
  'main .addr',
  'main .line',
  'footer .footer__brand',
  'footer .footer__nav-wrap',
].join(',');

export default function MotionEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = document.querySelectorAll(MOTION_TARGETS);
    if (!targets.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('motion-in--shown');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

    targets.forEach((element) => {
      const index = Array.prototype.indexOf.call(element.parentElement.children, element);
      element.style.setProperty('--motion-delay', `${(index % 4) * 90}ms`);
      element.classList.add('motion-in');
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
