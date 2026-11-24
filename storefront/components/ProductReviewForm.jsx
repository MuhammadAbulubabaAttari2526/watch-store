'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { submitProductReviewAction } from '@/lib/auth/actions';
import { Submit, Notice } from '@/components/account/Field';

export default function ProductReviewForm({ productId }) {
  const [state, action] = useFormState(submitProductReviewAction, {});
  const [rating, setRating] = useState(0);

  if (state?.ok) return <div className="review-form__success" role="status">{state.ok}</div>;

  return (
    <form action={action} className="review-form stack">
      <input type="hidden" name="product_id" value={productId} />
      <Notice state={state} />
      <fieldset className="review-rating">
        <legend>Your rating</legend>
        <div className="review-rating__stars" role="radiogroup" aria-label="Choose a star rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-checked={rating === value}
              aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
              className={rating >= value ? 'is-selected' : ''}
              key={value}
              onClick={() => setRating(value)}
              role="radio"
              type="button"
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <input type="hidden" name="rating" value={rating} />
      <label className="review-field">
        Review title <span>Optional</span>
        <input className="input" name="title" maxLength={100} placeholder="Sum up your experience" />
      </label>
      <label className="review-field">
        Your review
        <textarea className="input" name="body" required minLength={10} maxLength={2000} rows={4} placeholder="What did you like about this watch?" />
      </label>
      <p className="review-form__note">Reviews are checked by our team before they appear.</p>
      <Submit className="review-form__submit">Submit review <span aria-hidden="true">→</span></Submit>
    </form>
  );
}
