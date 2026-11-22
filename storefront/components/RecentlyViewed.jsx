'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'veltrix_recent';
const clean = (x) => x && typeof x.handle === 'string' && typeof x.title === 'string' && (!x.thumbnail || /^(https?:)?\//.test(x.thumbnail));

// Remembers the last watches this browser looked at (no prices are stored, so nothing goes stale).
export default function RecentlyViewed({ current }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    let list = [];
    try { list = (JSON.parse(localStorage.getItem(KEY)) || []).filter(clean); } catch {}
    const next = [current, ...list.filter((x) => x.handle !== current.handle)].slice(0, 8);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
    setItems(next.filter((x) => x.handle !== current.handle).slice(0, 4));
  }, [current.handle]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!items.length) return null;
  return (
    <div className="recent">
      <div className="section-head"><h2 style={{ margin: 0 }}>Recently viewed</h2><hr className="tick-rule" /></div>
      <div className="recent__grid">
        {items.map((x) => (
          <Link key={x.handle} href={`/products/${x.handle}`}>
            <div className="product-card__media">{x.thumbnail ? <img src={x.thumbnail} alt="" loading="lazy" /> : <div className="ph">No image yet</div>}</div>
            {x.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
