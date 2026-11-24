import AdminBody from '@/components/admin/AdminBody';
import { requireAdmin } from '@/lib/admin/server';

export default async function Layout({ children }) {
  const admin = await requireAdmin();
  return <AdminBody admin={admin}>{children}</AdminBody>;
}
