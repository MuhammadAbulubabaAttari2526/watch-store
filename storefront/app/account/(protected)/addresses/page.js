import { getCustomer } from '@/lib/auth/server';
import AddressManager from '@/components/account/AddressManager';
export const metadata = { title: 'Addresses | VELTRIX' };
export default async function Page() {
  const customer = await getCustomer();
  return <><h1 style={{ fontSize: 'var(--fs-2xl)' }}>Addresses</h1><hr className="tick-rule" style={{ margin: 'var(--sp-4) 0 var(--sp-5)' }} /><div style={{ maxWidth: '36rem' }}><AddressManager addresses={customer.addresses || []} /></div></>;
}
