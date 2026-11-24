'use client';

import { useFormState } from 'react-dom';
import { updateOrderStatusAction, updatePaymentStatusAction } from '@/lib/admin/actions';
import { Notice, Submit } from '@/components/account/Field';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'];
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

export function OrderStatusForm({ order, detailed = false }) {
  const [state, action] = useFormState(updateOrderStatusAction, {});
  return (
    <form
      action={action}
      className={detailed ? 'stack' : 'admin-order-status-form'}
      style={detailed ? undefined : { display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
    >
      <input type="hidden" name="id" value={order.id} />
      <label className={detailed ? 'field' : 'visually-hidden'}>{detailed ? 'New status' : 'Order status'}
        <select className="input" name="status" aria-label={detailed ? undefined : `Update order ${order.orderNumber}`} defaultValue={order.status}>
          {ORDER_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      {detailed && <label className="field">Note<input className="input" name="note" maxLength="500" /></label>}
      <Submit className={detailed ? '' : 'link-btn'}>{detailed ? 'Update order' : 'Save'}</Submit>
      <Notice state={state} />
    </form>
  );
}

export function PaymentStatusForm({ orderId, payment }) {
  const [state, action] = useFormState(updatePaymentStatusAction, {});
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={orderId} />
      <label className="field">Payment status ({payment.method})
        <select className="input" name="status" defaultValue={payment.status}>
          {PAYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      <Submit className="btn--ghost">Update payment</Submit>
      <Notice state={state} />
    </form>
  );
}
