'use client';
import Link from 'next/link';
import { useCart } from './CartProvider';
import { formatPrice } from '@/lib/utils/format';
import { useStoreCurrency } from './StoreProvider';

export default function CartLines() {
  const { items, updateItem, removeItem, busy, closeDrawer } = useCart();
  const currency = useStoreCurrency();
  return (
    <ul className="lines">
      {items.map((it) => {
        const title = it.product_title || it.title;
        const variant = it.variant_title && !/^default/i.test(it.variant_title) ? it.variant_title : null;
        return (
          <li key={it.id} className="line">
            <div className="line__img">{it.thumbnail ? <img src={it.thumbnail} alt="" width="80" height="100" /> : <div className="ph" />}</div>
            <div className="line__body">
              <Link href={it.product_handle ? `/products/${it.product_handle}` : '/products'} onClick={closeDrawer} className="line__title">{title}</Link>
              {variant && <span className="product-card__meta">{variant}</span>}
              <span className="price">{formatPrice(it.unit_price, currency)}</span>
              <div className="line__actions">
                <div className="qty qty--sm" role="group" aria-label={`Quantity of ${title}`}>
                  <button type="button" disabled={busy} onClick={() => updateItem(it.id, it.quantity - 1).catch(() => {})} aria-label="Decrease quantity">-</button>
                  <input value={it.quantity} readOnly aria-label="Quantity" />
                  <button type="button" disabled={busy} onClick={() => updateItem(it.id, it.quantity + 1).catch(() => {})} aria-label="Increase quantity">+</button>
                </div>
                <button type="button" className="link-btn" disabled={busy} onClick={() => removeItem(it.id).catch(() => {})}>Remove<span className="visually-hidden"> {title}</span></button>
              </div>
            </div>
            <div className="line__total">{formatPrice(it.total ?? it.unit_price * it.quantity, currency)}</div>
          </li>
        );
      })}
    </ul>
  );
}
