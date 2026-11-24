import { redirect } from 'next/navigation';
import { getCustomer } from '@/lib/auth/server';
import { safeInternalPath } from '@/lib/utils/redirects';

export async function guestOnly(next) {
  if (await getCustomer()) redirect(safeInternalPath(next));
}
