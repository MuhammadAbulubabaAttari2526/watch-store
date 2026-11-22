'use client';

import { useFormState } from 'react-dom';
import { updateCustomerStatusAction } from '@/lib/admin/actions';
import { Notice, Submit } from '@/components/account/Field';

export default function CustomerStatusForm({ customer }) {
  const [state, action] = useFormState(updateCustomerStatusAction, {});
  return (
    <form action={action} className="row">
      <input type="hidden" name="id" value={customer.id} />
      <label className="field">Account status
        <select className="input" name="status" defaultValue={customer.status}>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </label>
      <Submit>Save status</Submit>
      <Notice state={state} />
    </form>
  );
}
