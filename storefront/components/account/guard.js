import { redirect } from 'next/navigation';
import { getCustomer } from '@/lib/auth/server';
export async function guestOnly(next) { if (await getCustomer()) redirect(next && next.startsWith('/') && !next.startsWith('//') ? next : '/account'); }
