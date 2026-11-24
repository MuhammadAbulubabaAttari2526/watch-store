'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from './CartProvider';
import { useAuth } from './AuthProvider';
import { placeOrderAction } from '@/lib/auth/actions';
import CartSummary from './CartSummary';
import CouponForm from './CouponForm';
import * as api from '@/lib/api/cart';
import { formatPrice } from '@/lib/utils/format';
import { normalizePkPhone, PK_CITIES } from '@/lib/utils/phone';
import { etaFor, optionsForCity } from '@/lib/config/delivery';
import { useStoreCurrency } from './StoreProvider';

const EMPTY = { name: '', email: '', phone: '', address: '', city: '', postal: '', notes: '' };

export default function CheckoutForm() {
  const router = useRouter();
  const { cart, items, ready, clearCart, busy } = useCart();
  const customer = useAuth();
  const currency = useStoreCurrency();
  const [f, setF] = useState(EMPTY);
  const [errs, setErrs] = useState({});
  const [options, setOptions] = useState(null);
  const [shipId, setShipId] = useState('');
  const [setup, setSetup] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [fail, setFail] = useState(null);
  const idempotencyKey = useRef(null);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Signed-in customers get their details filled in; they can still edit everything.
  useEffect(() => {
    if (!customer) return;
    const a = customer.addresses?.find((x) => x.is_default_shipping) || customer.addresses?.[0];
    setF((cur) => ({
      ...cur,
      name: cur.name || [customer.first_name, customer.last_name].filter(Boolean).join(' '),
      email: cur.email || customer.email || '',
      phone: cur.phone || (customer.phone || '').replace(/^\+92/, '0'),
      address: cur.address || a?.address_1 || '', city: cur.city || a?.city || '', postal: cur.postal || a?.postal_code || '',
    }));
  }, [customer]);

  // Delivery prices are previews; the backend recalculates the charge at order placement.
  useEffect(() => {
    if (!cart?.id || items.length === 0) return;
    let alive = true;
    (async () => {
      try {
        const opts = await api.listShippingOptions();
        if (!alive) return;
        setOptions(opts);
        if (opts.length) setShipId(opts[0].id);
      } catch (e) { alive && setSetup(e.message); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.id]);

  function chooseShipping(id) {
    setShipId(id); setFail(null);
  }

  // Show only the delivery options that apply to the typed city; switch the selection if needed.
  const visible = options ? optionsForCity(options, f.city) : null;
  const visibleKey = visible ? visible.map((o) => o.id).join(',') : '';
  const selectedOption = visible?.find((option) => option.id === shipId);
  useEffect(() => {
    if (!visible || visible.length === 0 || !cart?.id) return;
    if (!visible.some((o) => o.id === shipId)) chooseShipping(visible[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  function validate() {
    const e = {};
    if (f.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = 'Enter a valid email address.';
    if (!normalizePkPhone(f.phone)) e.phone = 'Enter a Pakistani number, for example 0300 1234567.';
    if (f.address.trim().length < 6) e.address = 'Enter your full delivery address.';
    if (f.city.trim().length < 2) e.city = 'Enter your city.';
    if (f.postal && !/^\d{5}$/.test(f.postal.trim())) e.postal = 'Postal codes in Pakistan have 5 digits.';
    if (!shipId) e.ship = 'Choose a delivery method.';
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function place(ev) {
    ev.preventDefault(); setFail(null);
    if (!validate()) { document.querySelector('[aria-invalid="true"]')?.focus(); return; }
    setPlacing(true);
    try {
      const [first, ...rest] = f.name.trim().split(/\s+/);
      const order = await placeOrderAction({
        idempotencyKey: idempotencyKey.current || (idempotencyKey.current = crypto.randomUUID()),
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
        contactEmail: f.email.trim(),
        paymentMethod: 'COD',
        discountCode: cart.discount?.code,
        orderNotes: f.notes.trim() || undefined,
        shippingAddress: {
          firstName: first,
          lastName: rest.join(' ') || first,
          address1: f.address.trim(),
          city: f.city.trim(),
          postalCode: f.postal.trim() || undefined,
          countryCode: 'PK',
          phone: normalizePkPhone(f.phone),
        },
      });
      idempotencyKey.current = null;
      const o = order;
      try {
        sessionStorage.setItem('veltrix_last_order', JSON.stringify({
          id: o.id, number: o.orderNumber, email: o.contactEmail || f.email.trim(), currency: o.currencyCode || currency,
          total: Number(o.total), shipping_total: Number(o.shippingTotal),
          discount_total: Number(o.discountTotal), subtotal: Number(o.subtotal), notes: o.orderNotes,
          address: {
            first_name: o.shippingFirstName || f.name.trim().split(/\s+/)[0],
            last_name: o.shippingLastName || f.name.trim().split(/\s+/).slice(1).join(' '),
            address_1: o.shippingAddress1 || f.address.trim(),
            city: o.shippingCity || f.city.trim(),
            phone: o.shippingPhone || normalizePkPhone(f.phone),
          },
          items: (o.items || []).map((i) => ({ title: i.productTitle, variant: i.variantTitle, qty: i.quantity, total: Number(i.lineTotal) })),
        }));
      } catch {}
      try { localStorage.setItem('veltrix_last_order_number', o.orderNumber); } catch {}
      clearCart();
      router.replace('/order/confirmed');
    } catch (e) { setFail(e.message); setPlacing(false); }
  }

  if (!ready) return <div className="skeleton" style={{ height: 320 }} aria-busy="true" />;
  if (items.length === 0) return <div className="empty"><h2 style={{ fontSize: 'var(--fs-xl)' }}>Your cart is empty</h2><p>Add a watch before you check out.</p><Link className="btn" href="/products">Browse watches</Link></div>;

  const field = (k, label, props = {}) => (
    <div className={'field' + (errs[k] ? ' has-error' : '')}>
      <label htmlFor={'c-' + k}>{label}</label>
      <input id={'c-' + k} className="input" value={f[k]} onChange={set(k)} aria-invalid={!!errs[k]} aria-describedby={'e-' + k} {...props} />
      <span className="field__error" id={'e-' + k} role="alert">{errs[k]}</span>
    </div>
  );

  return (
    <form className="checkout" onSubmit={place} noValidate>
      <div className="checkout__main stack" style={{ '--stack': 'var(--sp-6)' }}>
        {setup && <div className="alert alert--error" role="alert">{setup}</div>}

        <fieldset className="box"><legend>Contact</legend>
          {field('name', 'Full name', { autoComplete: 'name' })}
          {field('email', 'Email', { type: 'email', autoComplete: 'email' })}
          {field('phone', 'Phone number', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '0300 1234567' })}
        </fieldset>

        <fieldset className="box"><legend>Delivery address</legend>
          {field('address', 'Address', { autoComplete: 'street-address' })}
          <div className="two">
            {field('city', 'City', { list: 'pk-cities', autoComplete: 'address-level2' })}
            {field('postal', 'Postal code (optional)', { inputMode: 'numeric', autoComplete: 'postal-code' })}
          </div>
          <datalist id="pk-cities">{PK_CITIES.map((c) => <option key={c} value={c} />)}</datalist>
          <div className="field"><label htmlFor="c-notes">Order notes (optional)</label><textarea id="c-notes" className="input" value={f.notes} onChange={set('notes')} /></div>
        </fieldset>

        <fieldset className="box"><legend>Delivery method</legend>
          {options === null && !setup && <div className="skeleton" style={{ height: 56 }} aria-busy="true" />}
          {options?.length === 0 && <div className="alert alert--error">No delivery options are configured yet.</div>}
          {visible?.map((o) => (
            <label key={o.id} className={'choice' + (shipId === o.id ? ' is-on' : '')}>
              <input type="radio" name="ship" checked={shipId === o.id} onChange={() => chooseShipping(o.id)} />
              <span>{o.name}</span><strong>{formatPrice(api.optionPrice(o), currency)}</strong>
            </label>
          ))}
          {f.city.trim().length > 1 ? <p className="eta">Estimated delivery to {f.city.trim()}: {etaFor(f.city)}.</p> : <p className="eta">Enter your city to see delivery options and timing for it.</p>}
          {errs.ship && <span className="field__error" style={{ display: 'block' }} role="alert">{errs.ship}</span>}
        </fieldset>

        <fieldset className="box"><legend>Payment</legend>
          <label className="choice is-on"><input type="radio" checked readOnly /><span>Cash on delivery<small>Pay in cash when your order arrives.</small></span></label>
        </fieldset>
      </div>

      <aside className="checkout__side stack">
        <h2 style={{ fontSize: 'var(--fs-xl)' }}>Order summary</h2>
        <ul className="mini">{items.map((i) => <li key={i.id}><span>{i.product_title || i.title}{i.variant_title && !/^default/i.test(i.variant_title) ? ` (${i.variant_title})` : ''} x {i.quantity}</span><span>{formatPrice(i.total, currency)}</span></li>)}</ul>
        <CouponForm />
        <CartSummary cart={cart} shippingChosen={!!selectedOption} shippingAmount={selectedOption ? api.optionPrice(selectedOption) : undefined} />
        {fail && <div className="alert alert--error" role="alert">{fail}</div>}
        <button className={'btn btn--block' + (placing ? ' is-loading' : '')} type="submit" disabled={placing || busy || !options?.length}>Place order</button>
        <p className="field__hint">Prices, discounts, delivery and stock are confirmed by our server when you place the order.</p>
      </aside>
    </form>
  );
}
