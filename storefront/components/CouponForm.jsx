'use client';
import { useState } from 'react';
import { useCart } from './CartProvider';

export default function CouponForm() {
  const { cart, applyCoupon, removeCoupon, busy } = useCart();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const applied = (cart?.promotions || []).filter((p) => p.code);
  async function submit(e) {
    e.preventDefault();
    const c = code.trim();
    if (!c) return setMsg('Enter a coupon code.');
    try { await applyCoupon(c); setCode(''); setMsg(null); } catch (err) { setMsg(err.message); }
  }
  return (
    <div className="coupon">
      <form onSubmit={submit} noValidate className={'field' + (msg ? ' has-error' : '')}>
        <label htmlFor="coupon">Coupon code</label>
        <div className="coupon__row">
          <input id="coupon" className="input" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" aria-describedby="coupon-err" />
          <button className="btn btn--ghost" type="submit" disabled={busy}>Apply</button>
        </div>
        <span className="field__error" id="coupon-err" role="alert">{msg}</span>
      </form>
      {applied.length > 0 && (
        <ul className="coupon__list">
          {applied.map((p) => <li key={p.id || p.code}><span className="badge">{p.code}</span><button type="button" className="link-btn" disabled={busy} onClick={() => removeCoupon(p.code).catch(() => {})}>Remove</button></li>)}
        </ul>
      )}
    </div>
  );
}
