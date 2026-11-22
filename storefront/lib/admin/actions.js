'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminApi, ADMIN_COOKIE, ADMIN_COOKIE_OPTS } from './server';

const text = (fd, key) => String(fd.get(key) ?? '').trim();

function saveAdminSession(response) {
  const setCookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
  const sessionCookie = setCookies.find((value) => value.startsWith(`${ADMIN_COOKIE}=`));
  const token = sessionCookie?.slice(ADMIN_COOKIE.length + 1).split(';', 1)[0];
  if (!token) throw new Error('The store API did not create an admin session.');
  cookies().set(ADMIN_COOKIE, decodeURIComponent(token), ADMIN_COOKIE_OPTS);
}

export async function adminLoginAction(_prev, fd) {
  const email = text(fd, 'email').toLowerCase();
  const password = String(fd.get('password') || '');
  if (!email || !password) return { message: 'Enter your email and password.' };
  try {
    await adminApi('POST', '/api/auth/admin/login', {
      body: { email, password },
      token: '',
      onResponse: saveAdminSession,
    });
  } catch (error) {
    return { message: error.status === 401 ? 'Email or password is incorrect.' : error.message };
  }
  redirect('/admin');
}

export async function adminLogoutAction() {
  cookies().delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

export async function updateOrderStatusAction(fd) {
  const id = text(fd, 'id');
  const status = text(fd, 'status');
  if (!id || !status) return;
  await adminApi('PATCH', `/api/admin/orders/${encodeURIComponent(id)}/status`, { body: { status } });
  revalidatePath('/admin');
}

export async function updateProductStatusAction(fd) {
  const id = text(fd, 'id');
  const status = text(fd, 'status');
  if (!id || !status) return;
  await adminApi('PATCH', `/api/admin/products/${encodeURIComponent(id)}/status`, { body: { status } });
  revalidatePath('/admin');
}
