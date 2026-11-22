import AdminBody from '@/components/admin/AdminBody';
import { requireAdmin } from '@/lib/admin/server';

export default async function Layout({ children }) {
  await requireAdmin();
  return <AdminBody>{children}</AdminBody>;
}
