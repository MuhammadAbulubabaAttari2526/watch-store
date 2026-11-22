// Server-only admin session helpers.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { request } from '@/lib/api/client';

export const ADMIN_COOKIE = 'veltrix_admin';
export const ADMIN_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
};

export const getAdminToken = () => cookies().get(ADMIN_COOKIE)?.value || null;

export const adminApi = (method, path, options = {}) =>
  request(path, { ...options, method, token: options.token ?? getAdminToken() });

export async function getAdmin() {
  if (!getAdminToken()) return null;
  try {
    const { user } = await adminApi('GET', '/api/auth/admin/me');
    return user;
  } catch (error) {
    if (error.status === 401 || error.status === 404) return null;
    throw error;
  }
}

export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect('/admin/login');
  return admin;
}
