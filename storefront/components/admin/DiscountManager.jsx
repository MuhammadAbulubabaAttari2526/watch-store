'use client';

import { useFormState } from 'react-dom';
import { deleteDiscountAction, saveDiscountAction } from '@/lib/admin/actions';
import { Notice, Submit } from '@/components/account/Field';
import { formatPrice } from '@/lib/utils/format';
import { useStoreCurrency } from '@/components/StoreProvider';

const localDateTime = (value) => value ? new Date(value).toISOString().slice(0, 16) : '';

function DiscountRow({ discount }) {
  const [state, action] = useFormState(saveDiscountAction, {});
  const [deleteState, deleteAction] = useFormState(deleteDiscountAction, {});
  const currency = useStoreCurrency();
  return (
    <article className="admin-panel stack">
      <form action={action} className="stack">
        <input type="hidden" name="id" value={discount.id} />
        <input type="hidden" name="code" value={discount.code} />
        <input type="hidden" name="type" value={discount.type} />
        <input type="hidden" name="value" value={discount.value} />
        <input type="hidden" name="minimum_order" value={discount.minimum_order ?? ''} />
        <input type="hidden" name="usage_limit" value={discount.usage_limit ?? ''} />
        <input type="hidden" name="starts_at" value={localDateTime(discount.starts_at)} />
        <input type="hidden" name="expires_at" value={localDateTime(discount.expires_at)} />
        <strong>{discount.code}</strong>
        <span>{discount.type === 'PERCENTAGE' ? `${discount.value}%` : formatPrice(discount.value, currency)} · Used {discount.usage_count}{discount.usage_limit ? ` of ${discount.usage_limit}` : ''}</span>
        <label className="admin-check-field"><input type="checkbox" name="is_active" defaultChecked={discount.is_active} /> Active</label>
        <Notice state={state} />
        <Submit>Save</Submit>
      </form>
      <form action={deleteAction}>
        <input type="hidden" name="id" value={discount.id} />
        <Notice state={deleteState} />
        <button className="link-btn" type="submit">Delete</button>
      </form>
    </article>
  );
}

export default function DiscountManager({ discounts = [] }) {
  const [state, action] = useFormState(saveDiscountAction, {});
  return (
    <section className="admin-panel admin-fields-panel admin-discount-panel stack">
      <div className="admin-panel__head"><h2>Discount codes</h2></div>
      <form action={action} className="stack admin-fields-form">
        <div className="two">
          <label className="field">Code<input className="input" name="code" required minLength={3} maxLength={32} /></label>
          <label className="field">Type<select className="input" name="type" defaultValue="PERCENTAGE"><option value="PERCENTAGE">Percentage</option><option value="FIXED_AMOUNT">Fixed amount</option></select></label>
          <label className="field">Value<input className="input" name="value" type="number" min="0.01" step="0.01" required /></label>
          <label className="field">Minimum order<input className="input" name="minimum_order" type="number" min="0" step="0.01" /></label>
          <label className="field">Usage limit<input className="input" name="usage_limit" type="number" min="0" step="1" /></label>
          <label className="field">Starts at (UTC)<input className="input" name="starts_at" type="datetime-local" /></label>
          <label className="field">Expires at (UTC)<input className="input" name="expires_at" type="datetime-local" /></label>
          <label className="admin-check-field"><input type="checkbox" name="is_active" defaultChecked /> Active</label>
        </div>
        <Notice state={state} /><Submit>Add discount</Submit>
      </form>
      <div className="admin-grid">{discounts.map((discount) => <DiscountRow key={discount.id} discount={discount} />)}</div>
    </section>
  );
}
