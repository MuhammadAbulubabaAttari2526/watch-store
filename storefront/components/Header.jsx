'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from './CartProvider';
import { useAuth } from './AuthProvider';
import SearchDialog from './SearchDialog';

const LINKS = [
  ['Shop', '/products'],
  ['Collections', '/#collections'],
  ['Best sellers', '/products?collection=best-sellers'],
  ['New arrivals', '/products?collection=new-arrivals'],
  ['Our story', '/#story'],
];

const Icon = ({ d }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d={d} /></svg>
);

const MenuIcon = ({ open }) => (
  <svg className={'menu-icon' + (open ? ' is-open' : '')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <path className="menu-icon__line menu-icon__line--top" d="M4 7h16" />
    <path className="menu-icon__line menu-icon__line--middle" d="M4 12h16" />
    <path className="menu-icon__line menu-icon__line--bottom" d="M4 17h16" />
  </svg>
);

export default function Header() {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const { count, openDrawer } = useCart();
  const customer = useAuth();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <header className="site-header">
      <div className="container site-header__bar">
        <button className="icon-btn menu-btn" aria-expanded={open} aria-controls="nav" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>
          <MenuIcon open={open} />
          <span className="menu-btn__label" aria-hidden="true">{open ? 'Close' : 'Menu'}</span>
        </button>
        <Link className="logo" href="/" aria-label="VELTRIX home">VELTRIX</Link>
        <nav id="nav" className={'nav' + (open ? ' is-open' : '')} aria-label="Main">
          {LINKS.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
        </nav>
        <div className="header-tools">
          <button className="icon-btn" onClick={() => setSearching(true)} aria-label="Search"><Icon d="M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4" /></button>
          <Link className="icon-btn" href={customer ? "/account" : "/account/login"} aria-label={customer ? "My account" : "Sign in"}><Icon d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0" /></Link>
          <button className="icon-btn cart-btn" onClick={openDrawer} aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}><Icon d="M5 8h14l-1 12H6L5 8zM9 8a3 3 0 016 0" />{count > 0 && <span className="cart-badge" aria-hidden="true">{count}</span>}</button>
        </div>
      </div>
      <SearchDialog open={searching} onClose={() => setSearching(false)} />
    </header>
  );
}
