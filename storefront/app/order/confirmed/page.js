import OrderConfirmed from '@/components/OrderConfirmed';
export const metadata = { title: 'Order confirmed | VELTRIX', robots: { index: false } };
export default function Page() {
  return <section className="section"><div className="container"><div className="section-head"><h1 style={{ fontSize: 'var(--fs-2xl)', margin: 0 }}>Thank you</h1><hr className="tick-rule" /></div><OrderConfirmed /></div></section>;
}
