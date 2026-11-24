'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import ProductReviewForm from '@/components/ProductReviewForm';

const tabs = [
  ['description', 'Description'],
  ['specifications', 'Specifications'],
  ['reviews', 'Reviews'],
];

function ReviewStars({ value, label }) {
  return (
    <span className="review-stars" role="img" aria-label={label || `${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => <span className={star <= Math.round(value) ? 'is-filled' : ''} key={star}>★</span>)}
    </span>
  );
}

function ReviewsPanel({ productId, handle, reviews, ownReview }) {
  const customer = useAuth();
  const average = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const isCustomer = customer?.role === 'customer' && customer?.status === 'ACTIVE';
  const returnTo = `/products/${handle}#reviews`;
  const signInHref = `/account/login?next=${encodeURIComponent(returnTo)}`;
  const registerHref = `/account/register?next=${encodeURIComponent(returnTo)}`;

  return (
    <div className="pdp-tabs__body reviews-panel" id="reviews" role="tabpanel" aria-labelledby="tab-reviews">
      <div className="reviews-summary">
        <strong>{reviews.length ? average.toFixed(1) : '—'}</strong>
        <div>
          <ReviewStars value={average} label={reviews.length ? `${average.toFixed(1)} out of 5 stars` : 'No ratings yet'} />
          <p>{reviews.length ? `${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}` : 'No reviews yet'}</p>
        </div>
      </div>

      {reviews.length ? (
        <div className="reviews-list">
          {reviews.map((review) => (
            <article className="review-card" key={review.id}>
              <div className="review-card__meta">
                <span>VELTRIX customer</span>
                <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</time>
              </div>
              <ReviewStars value={review.rating} label={`${review.rating} out of 5 stars`} />
              {review.title && <h3>{review.title}</h3>}
              <p>{review.body}</p>
            </article>
          ))}
        </div>
      ) : <p className="reviews-empty">Be the first to share what you think about this watch.</p>}

      {ownReview ? (
        <p className={`review-status review-status--${ownReview.status.toLowerCase()}`} role="status">
          {ownReview.status === 'PENDING'
            ? 'Your review is waiting for approval.'
            : ownReview.status === 'APPROVED'
              ? 'You have already reviewed this watch.'
              : 'A review for this watch was already submitted from your account.'}
        </p>
      ) : isCustomer ? (
        <ProductReviewForm productId={productId} />
      ) : customer ? (
        <p className="review-signin">Product reviews can be submitted from an active customer account.</p>
      ) : (
        <div className="review-signin">
          <p>Sign in to leave a review. New reviews appear after approval.</p>
          <div>
            <Link className="btn btn--gold" href={signInHref}>Sign in to review</Link>
            <Link className="review-signin__register" href={registerHref}>Create an account</Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductDetailsTabs({ description, specs, warranty, productId, handle, reviews, ownReview }) {
  const [activeTab, setActiveTab] = useState('description');

  useEffect(() => {
    if (window.location.hash === '#reviews') setActiveTab('reviews');
  }, []);

  useEffect(() => {
    if (activeTab !== 'reviews' || window.location.hash !== '#reviews') return;
    const frame = window.requestAnimationFrame(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab]);

  const changeTab = (tab) => {
    setActiveTab(tab);
    const nextUrl = tab === 'reviews' ? '#reviews' : `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, '', nextUrl);
  };

  return (
    <div className="pdp-tabs">
      <div className="pdp-tabs__labels" role="tablist" aria-label="Product details">
        {tabs.map(([id, label]) => (
          <button
            aria-controls={id === 'reviews' ? 'reviews' : `panel-${id}`}
            aria-selected={activeTab === id}
            className={activeTab === id ? 'is-active' : ''}
            id={`tab-${id}`}
            key={id}
            onClick={() => changeTab(id)}
            role="tab"
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'description' && (
        <div className="pdp-tabs__body" id="panel-description" role="tabpanel" aria-labelledby="tab-description">
          {description ? <p className="pre">{description}</p> : <p>This VELTRIX watch pairs classic design with considered details for everyday wear.</p>}
        </div>
      )}
      {activeTab === 'specifications' && (
        <div className="pdp-tabs__body" id="panel-specifications" role="tabpanel" aria-labelledby="tab-specifications">
          {specs.length ? <dl className="specs pdp-specs">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <p>Specifications have not been added for this watch yet.</p>}
          {warranty && <p className="pdp-tabs__warranty">Warranty: {warranty}</p>}
        </div>
      )}
      {activeTab === 'reviews' && <ReviewsPanel productId={productId} handle={handle} reviews={reviews} ownReview={ownReview} />}
    </div>
  );
}
