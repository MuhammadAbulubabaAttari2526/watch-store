'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { formatPrice } from '@/lib/utils/format';
import { useStoreCurrency } from './StoreProvider';
import { useEffect } from 'react';

export default function ProductPurchase({ product, whatsapp }) {
  const options = product.options.filter((o) => o.values.length > 1);
  const [sel, setSel] = useState({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState(null);
  const [working, setWorking] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const router = useRouter();
  const { addItem } = useCart();
  const currency = useStoreCurrency();
  useEffect(() => {
    try { setWishlisted(JSON.parse(localStorage.getItem('veltrix_wishlist') || '[]').includes(product.id)); }
    catch {}
  }, [product.id]);

  function toggleWishlist() {
    try {
      const current = JSON.parse(localStorage.getItem('veltrix_wishlist') || '[]');
      const next = current.includes(product.id)
        ? current.filter((id) => id !== product.id)
        : [...current, product.id];
      localStorage.setItem('veltrix_wishlist', JSON.stringify(next));
      setWishlisted(next.includes(product.id));
    } catch {}
  }

  // Options with a single value are chosen for the customer.
  const fixed = useMemo(() => Object.fromEntries(product.options.filter((o) => o.values.length === 1).map((o) => [o.id, o.values[0]])), [product]);
  const chosen = { ...fixed, ...sel };
  const variant = product.variants.find((v) => product.options.every((o) => chosen[o.id] && v.options[o.id] === chosen[o.id])) || null;
  const missing = options.find((o) => !sel[o.id]);

  const prices = product.variants.map((v) => v.price).filter((n) => n != null);
  const from = prices.length ? Math.min(...prices) : null;
  const shown = variant ? variant.price : from;
  const original = variant && variant.original > variant.price ? variant.original : null;

  const valueSoldOut = (opt, val) => !product.variants.some((v) => v.available && v.options[opt.id] === val && Object.entries(sel).every(([k, x]) => k === opt.id || v.options[k] === x));
  const max = variant?.quantity ? Math.min(variant.quantity, 10) : 10;
  const status = !variant ? null : variant.available ? (variant.quantity != null && variant.quantity <= 5 ? `Only ${variant.quantity} left` : 'In stock') : 'Out of stock';

  async function add(buyNow) {
    setNote(null);
    if (missing) return setNote(`Choose a ${missing.title.toLowerCase()} first.`);
    if (!variant) return setNote('This combination is not available.');
    if (!variant.available) return setNote('This watch is out of stock.');
    setWorking(true);
    try { await addItem(variant.id, qty); if (buyNow) router.push('/checkout'); }
    catch (e) { setNote(e.message); }
    finally { setWorking(false); }
  }

  return (
    <div className="pdp__purchase stack">
      <div className="pdp__price-row">
        <div className={'price price--lg price--pdp' + (original ? ' price--sale' : '')} aria-live="polite">
          {!variant && from != null && <span className="price__from">From</span>}
          {shown != null ? formatPrice(shown, currency) : 'Price on request'}{original && <s>{formatPrice(original, currency)}</s>}
        </div>
        {original && shown != null && <span className="pdp__discount">{Math.round((1 - shown / original) * 100)}% OFF</span>}
      </div>
      {status && <p className={'pdp__stock ' + (variant.available ? '' : 'pdp__stock--out')} role="status">{status}</p>}

      {options.map((o) => (
        <fieldset key={o.id} className="opt">
          <legend>{o.title}{sel[o.id] ? `: ${sel[o.id]}` : ''}</legend>
          <div className="opt__values">
            {o.values.map((val) => {
              const out = valueSoldOut(o, val);
              return <button key={val} type="button" className={'opt__btn' + (sel[o.id] === val ? ' is-on' : '') + (out ? ' is-out' : '')}
                aria-pressed={sel[o.id] === val} onClick={() => { setSel({ ...sel, [o.id]: val }); setQty(1); }}>{val}{out && <span className="visually-hidden"> (sold out)</span>}</button>;
            })}
          </div>
        </fieldset>
      ))}

      {variant && (
        <div className="pdp__qty-row">
          <div className="qty pdp__qty" role="group" aria-label="Quantity">
            <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
            <input value={qty} readOnly aria-label="Quantity" />
            <button type="button" onClick={() => setQty(Math.min(max, qty + 1))} aria-label="Increase quantity">+</button>
          </div>
          <button type="button" className="pdp__buy-now" disabled={working || !variant.available} onClick={() => add(true)}>Buy now</button>
        </div>
      )}

      <div className="buy-row pdp__actions">
        <button type="button" className={'btn pdp__cart' + (working ? ' is-loading' : '')} disabled={working || (variant && !variant.available)} onClick={() => add(false)}><span aria-hidden="true">♧</span>Add to cart</button>
        <button type="button" className={'btn btn--ghost pdp__wishlist' + (wishlisted ? ' is-active' : '')} aria-pressed={wishlisted} onClick={toggleWishlist}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill={wishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /></svg>
          {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
        </button>
      </div>
      {note && <p className="field__error" style={{ display: 'block' }} role="alert">{note}</p>}
      {whatsapp && <a className="btn btn--gold btn--block" href={`${whatsapp}${encodeURIComponent(` Watch: ${product.title}${variant && variant.title ? ' (' + variant.title + ')' : ''}, quantity ${qty}.`)}`} target="_blank" rel="noopener noreferrer">Order on WhatsApp</a>}
    </div>
  );
}
