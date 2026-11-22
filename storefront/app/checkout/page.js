import CheckoutForm from '@/components/CheckoutForm';
export const metadata = { title: 'Checkout | VELTRIX', robots: { index: false } };
export default function CheckoutPage() {
  return <section className="section"><div className="container"><div className="section-head"><h1 style={{ fontSize: 'var(--fs-2xl)', margin: 0 }}>Checkout</h1><hr className="tick-rule" /></div><CheckoutForm /></div></section>;
}
