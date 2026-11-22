'use client';

import { formatPrice } from '@/lib/utils/format';
import { useStoreCurrency } from './StoreProvider';

export default function CartSummary({ cart, shipFrom, shippingChosen, shippingAmount }) {
  const currency = useStoreCurrency();
  const sub = cart.item_subtotal ?? cart.subtotal ?? 0;
  const disc = cart.discount_total || 0;
  const charge = shippingAmount ?? cart.shipping_total ?? 0;
  const shipping = shippingChosen ? formatPrice(charge, currency) : shipFrom != null ? `From ${formatPrice(shipFrom, currency)}` : 'Calculated at checkout';
  const total = Number(cart.total ?? sub - disc) + (shippingChosen ? Number(charge) : 0);
  return (
    <dl className="summary">
      <div><dt>Subtotal</dt><dd>{formatPrice(sub, currency)}</dd></div>
      {disc > 0 && <div className="summary__disc"><dt>Discount</dt><dd>-{formatPrice(disc, currency)}</dd></div>}
      <div><dt>Delivery</dt><dd>{shipping}</dd></div>
      <div className="summary__total"><dt>Total{shippingChosen ? '' : ' before delivery'}</dt><dd>{formatPrice(total, currency)}</dd></div>
    </dl>
  );
}
