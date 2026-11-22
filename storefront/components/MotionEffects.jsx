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
  'main .results-count',
  'main .pagination',
  'main .gallery',
  'main .gallery__thumbs > li',
  'main .pdp__info',
  'main .specs > div',
  'main .mini > li',
  'main .track > li',
  'main .recent__grid > a',
  'main .coupon__list > li',
  'main .cart-layout',
  'main .checkout',
  'main .auth',
  'main .confirm',
  'main .account__nav',
  'main .box',
  'main .orders__row',
  'main .addr',
  '.line',
  '.suggest > li',
  'footer .footer__brand',
  'footer .footer__nav-wrap',
].join(',');

export default function MotionEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('motion-in--shown');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -32px 0px' });

    const observeTargets = (root) => {
      const targets = [];
      if (root instanceof Element && root.matches(MOTION_TARGETS)) targets.push(root);
      if (root.querySelectorAll) targets.push(...root.querySelectorAll(MOTION_TARGETS));

      targets.forEach((element) => {
        if (element.classList.contains('motion-in')) return;
        const index = element.parentElement
          ? Array.prototype.indexOf.call(element.parentElement.children, element)
          : 0;
        element.style.setProperty('--motion-delay', `${(index % 4) * 90}ms`);
        element.classList.add('motion-in');
        observer.observe(element);
      });
    };

    observeTargets(document);
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) observeTargets(node);
        });
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, [pathname]);

  return null;
}
