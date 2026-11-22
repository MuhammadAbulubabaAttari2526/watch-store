'use client';

import { useFormState } from 'react-dom';
import { updateReviewStatusAction } from '@/lib/admin/actions';
import { Notice, Submit } from '@/components/account/Field';

export default function ReviewStatusForm({ review }) {
  const [state, action] = useFormState(updateReviewStatusAction, {});
  return (
    <form action={action} className="row">
      <input type="hidden" name="id" value={review.id} />
      <select className="input" name="status" aria-label={`Review status for ${review.product?.title || 'product'}`} defaultValue={review.status}>
        {['PENDING', 'APPROVED', 'REJECTED'].map((status) => <option key={status}>{status}</option>)}
      </select>
      <Submit>Save</Submit>
      <Notice state={state} />
    </form>
  );
}
