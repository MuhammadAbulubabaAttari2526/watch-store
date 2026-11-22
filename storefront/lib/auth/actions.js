'use server';
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { api, COOKIE, COOKIE_OPTS } from './server';
import { normalizePkPhone } from '@/lib/utils/phone';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd, k) => String(fd.get(k) ?? '').trim();
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/account');

function saveCustomerSession(response) {
  const setCookies = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || ''];
  const sessionCookie = setCookies.find((value) => value.startsWith(`${COOKIE}=`));
  const token = sessionCookie?.slice(COOKIE.length + 1).split(';', 1)[0];
  if (!token) throw new Error('The store API did not create a customer session.');
  cookies().set(COOKIE, decodeURIComponent(token), COOKIE_OPTS);
}

async function signIn(email, password) {
  await api('POST', '/api/auth/login', { body: { email, password }, token: '', onResponse: saveCustomerSession });
}

export async function loginAction(_prev, fd) {
  const email = text(fd, 'email').toLowerCase(), password = String(fd.get('password') || '');
  if (!EMAIL.test(email) || !password) return { message: 'Enter your email and password.' };
  try { await signIn(email, password); }
  catch (e) { return { message: e.status === 401 ? 'Email or password is incorrect.' : e.message }; }
  redirect(safeNext(text(fd, 'next')));
}

export async function registerAction(_prev, fd) {
  const first = text(fd, 'first_name'), last = text(fd, 'last_name') || first, email = text(fd, 'email').toLowerCase();
  const phoneRaw = text(fd, 'phone'), password = String(fd.get('password') || '');
  const errors = {};
  if (first.length < 2) errors.first_name = 'Enter your first name.';
  if (!EMAIL.test(email)) errors.email = 'Enter a valid email address.';
  if (phoneRaw && !normalizePkPhone(phoneRaw)) errors.phone = 'Enter a Pakistani number, for example 0300 1234567.';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  if (Object.keys(errors).length) return { errors };
  try {
    await api('POST', '/api/auth/register', {
      body: { email, password, firstName: first, lastName: last, phone: phoneRaw ? normalizePkPhone(phoneRaw) : undefined },
      token: '',
      onResponse: saveCustomerSession,
    });
  } catch (e) {
    return { message: /exists/i.test(e.message) ? 'An account with this email already exists. Try signing in.' : e.message };
  }
  redirect(safeNext(text(fd, 'next')));
}

export async function logoutAction() {
  cookies().delete(COOKIE);
  redirect('/');
}

// Always the same reply, so nobody can use this form to discover which emails have accounts.
export async function forgotPasswordAction(_prev, fd) {
  const email = text(fd, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { errors: { email: 'Enter a valid email address.' } };
  try { await api('POST', '/api/auth/forgot-password', { body: { email }, token: '' }); }
  catch { return { message: 'Password reset is not available right now. Please try again later.' }; }
  return { ok: 'If an account exists for that email, we have sent a reset link.' };
}

export async function resetPasswordAction(_prev, fd) {
  const token = text(fd, 'token'), email = text(fd, 'email').toLowerCase(), password = String(fd.get('password') || '');
  if (!token || !EMAIL.test(email)) return { message: 'This reset link is not valid. Request a new one.' };
  if (password.length < 8) return { errors: { password: 'Use at least 8 characters.' } };
  try { await api('POST', '/api/auth/reset-password', { token, body: { email, password } }); }
  catch (error) {
    if (error.status === 404) return { message: 'Password reset is not available yet. Contact the store for help.' };
    if ([400, 401].includes(error.status)) return { message: 'This reset link has expired or was already used. Request a new one.' };
    return { message: error.message };
  }
  redirect('/account/login?reset=1');
}

export async function updateProfileAction(_prev, fd) {
  const first = text(fd, 'first_name'), last = text(fd, 'last_name') || first, phoneRaw = text(fd, 'phone');
  const errors = {};
  if (first.length < 2) errors.first_name = 'Enter your first name.';
  if (phoneRaw && !normalizePkPhone(phoneRaw)) errors.phone = 'Enter a Pakistani number, for example 0300 1234567.';
  if (Object.keys(errors).length) return { errors };
  try { await api('PUT', '/api/customers/me', { body: { firstName: first, lastName: last, phone: phoneRaw ? normalizePkPhone(phoneRaw) : '' } }); }
  catch (e) { return { message: e.message }; }
  revalidatePath('/account');
  return { ok: 'Profile saved.' };
}

export async function saveAddressAction(_prev, fd) {
  const id = text(fd, 'id');
  const firstName = text(fd, 'first_name');
  const a = { label: text(fd, 'address_name') || undefined, firstName, lastName: text(fd, 'last_name') || firstName, addressLine1: text(fd, 'address_1'), city: text(fd, 'city'), postalCode: text(fd, 'postal_code') || undefined, phone: normalizePkPhone(text(fd, 'phone')), isDefault: fd.get('is_default') === 'on' };
  const errors = {};
  if (a.firstName.length < 2) errors.first_name = 'Enter a first name.';
  if (a.addressLine1.length < 6) errors.address_1 = 'Enter the full address.';
  if (a.city.length < 2) errors.city = 'Enter the city.';
  if (!a.phone) errors.phone = 'Enter a Pakistani number, for example 0300 1234567.';
  if (a.postal_code && !/^\d{5}$/.test(a.postal_code)) errors.postal_code = 'Postal codes have 5 digits.';
  if (Object.keys(errors).length) return { errors };
  try { await api(id ? 'PUT' : 'POST', id ? `/api/customers/me/addresses/${encodeURIComponent(id)}` : '/api/customers/me/addresses', { body: a }); }
  catch (e) { return { message: e.message }; }
  revalidatePath('/account/addresses');
  return { ok: 'Address saved.', done: Date.now() };
}

export async function deleteAddressAction(fd) {
  const id = text(fd, 'id');
  if (id) await api('DELETE', `/api/customers/me/addresses/${encodeURIComponent(id)}`);
  revalidatePath('/account/addresses');
}

// Attach the browser's cart to the signed-in customer so the order lands in their history.
export async function linkCartAction(cartId) {
  try { await api('POST', `/api/carts/${encodeURIComponent(cartId)}/attach`, { body: {} }); return true; }
  catch { return false; }
}

export async function placeOrderAction(order) {
  const { order: created } = await api('POST', '/api/orders', {
    body: order,
    headers: { 'x-idempotency-key': randomUUID() },
  });
  revalidatePath('/account/orders');
  return created;
}
