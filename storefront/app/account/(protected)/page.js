import { getCustomer } from '@/lib/auth/server';
import ProfileForm from '@/components/account/ProfileForm';
export const metadata = { title: 'My account | VELTRIX' };
export default async function Page() {
  const customer = await getCustomer();
  return <><h1 style={{ fontSize: 'var(--fs-2xl)' }}>Hello, {customer.first_name || 'there'}</h1><hr className="tick-rule" style={{ margin: 'var(--sp-4) 0 var(--sp-5)' }} /><div style={{ maxWidth: '32rem' }}><ProfileForm customer={customer} /></div></>;
}
