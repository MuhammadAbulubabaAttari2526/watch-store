'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { suggest } from '@/lib/api/suggest';

export default function SearchDialog({ open, onClose }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const ref = useRef(null);
  const [hits, setHits] = useState([]);
  const [searchError, setSearchError] = useState(null);
  useEffect(() => {
    const t = q.trim();
    if (!open || t.length < 2) { setHits([]); setSearchError(null); return; }
    let alive = true;
    setSearchError(null);
    const id = setTimeout(() => suggest(t)
      .then((r) => alive && setHits(r))
      .catch((error) => alive && setSearchError(error.message)), 250);
    return () => { alive = false; clearTimeout(id); };
  }, [q, open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  function submit(e) {
    e.preventDefault();
    const t = q.trim();
    if (!t) return;
    onClose();
    router.push(`/products?q=${encodeURIComponent(t)}`);
  }
  return (
    <div className="modal modal--top" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="search-box" role="search" onSubmit={submit}>
        <label htmlFor="site-search" className="visually-hidden">Search watches</label>
        <input id="site-search" ref={ref} className="input" type="search" placeholder="Search watches" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        <button className="btn" type="submit">Search</button>
        <button className="btn btn--ghost" type="button" onClick={onClose}>Close</button>
        {searchError && <p className="field__error" role="alert">{searchError}</p>}
        {hits.length > 0 && <ul className="suggest" aria-label="Suggestions">{hits.map((h) => <li key={h.id}><Link href={`/products/${h.handle}`} onClick={onClose}>{h.thumbnail ? <img src={h.thumbnail} alt="" /> : <div className="ph" />}<span>{h.title}</span></Link></li>)}</ul>}
      </form>
    </div>
  );
}
