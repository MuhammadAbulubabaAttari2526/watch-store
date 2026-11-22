import CartView from '@/components/CartView';
export const metadata = { title: 'Your cart | VELTRIX', robots: { index: false } };
export default function CartPage() {
  return <section className="section"><div className="container"><div className="section-head"><h1 style={{ fontSize: 'var(--fs-2xl)', margin: 0 }}>Your cart</h1><hr className="tick-rule" /></div><CartView /></div></section>;
}
