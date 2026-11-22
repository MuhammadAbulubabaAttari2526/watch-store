'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartProvider';
import { formatPrice } from '@/lib/utils/format';
import { useStoreCurrency } from './StoreProvider';

export default function ProductPurchase({ product, whatsapp }) {
  const options = product.options.filter((o) => o.values.length > 1);
  const [sel, setSel] = useState({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState(null);
  const [working, setWorking] = useState(false);
  const router = useRouter();
  const { addItem } = useCart();
  const currency = useStoreCurrency();

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
    <div className="stack">
      <div className={'price price--lg' + (original ? ' price--sale' : '')} aria-live="polite">
        {!variant && from != null && <span className="price__from">From</span>}
        {shown != null ? formatPrice(shown, currency) : 'Price on request'}{original && <s>{formatPrice(original, currency)}</s>}
      </div>

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

      {status && <p className={'stock' + (variant.available ? '' : ' stock--out')} role="status">{status}</p>}
      
      <div className="qty" role="group" aria-label="Quantity">
        <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">-</button>
        <input value={qty} readOnly aria-label="Quantity" />
        <button type="button" onClick={() => setQty(Math.min(max, qty + 1))} aria-label="Increase quantity">+</button>
      </div>

      <div className="buy-row">
        <button type="button" className={'btn' + (working ? ' is-loading' : '')} disabled={working || (variant && !variant.available)} onClick={() => add(false)}>Add to cart</button>
        <button type="button" className="btn btn--ghost" disabled={working || (variant && !variant.available)} onClick={() => add(true)}>Buy now</button>
      </div>
      {note && <p className="field__error" style={{ display: 'block' }} role="alert">{note}</p>}
      {whatsapp && <a className="btn btn--gold btn--block" href={`${whatsapp}${encodeURIComponent(` Watch: ${product.title}${variant && variant.title ? ' (' + variant.title + ')' : ''}, quantity ${qty}.`)}`} target="_blank" rel="noopener noreferrer">Order on WhatsApp</a>}
    </div>
  );
}
