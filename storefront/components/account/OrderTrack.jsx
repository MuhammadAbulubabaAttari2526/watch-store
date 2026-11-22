const STEPS = ['Order placed', 'Being prepared', 'Shipped', 'Delivered'];

function stage(o) {
  const f = o.fulfillment_status || 'not_fulfilled';
  if (f === 'delivered' || f === 'partially_delivered') return 3;
  if (f === 'shipped' || f === 'partially_shipped') return 2;
  if (f === 'fulfilled' || f === 'partially_fulfilled') return 1;
  return 0;
}

export default function OrderTrack({ order }) {
  if (order.status === 'canceled') return <div className="alert alert--error">This order was cancelled.</div>;
  const s = stage(order);
  return (
    <ol className="track" aria-label="Order progress">
      {STEPS.map((label, i) => <li key={label} className={i <= s ? 'is-done' : ''} aria-current={i === s ? 'step' : undefined}><span>{label}</span></li>)}
    </ol>
  );
}
