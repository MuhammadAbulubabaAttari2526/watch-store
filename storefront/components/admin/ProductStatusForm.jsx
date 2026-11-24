'use client';

import { useFormState } from 'react-dom';
import { updateProductStatusAction } from '@/lib/admin/actions';
import { Notice, Submit } from '@/components/account/Field';

const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export default function ProductStatusForm({ product }) {
  const [state, action] = useFormState(updateProductStatusAction, {});
  return (
    <div className="admin-product-status-form">
      <form action={action} style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="hidden" name="id" value={product.id} />
        <select className="input" name="status" aria-label={`Set status for ${product.title}`} defaultValue={product.status}>
          {PRODUCT_STATUSES.map((status) => <option key={status}>{status}</option>)}
        </select>
        <Submit className="link-btn">Save status</Submit>
      </form>
      <Notice state={state} />
    </div>
  );
}
