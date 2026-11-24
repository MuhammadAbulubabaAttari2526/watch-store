'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { normalizePkPhone } from '@/lib/utils/phone';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (fd, key) => String(fd.get(key) ?? '').trim();
const safeNext = (next, fallback = '/account') => (next && next.startsWith('/') && !next.startsWith('//') ? next : fallback);
const authError = (error) => error.message || 'The request could not be completed. Please try again.';

export async function loginAction(_prev, fd) {
  const email = text(fd, 'email').toLowerCase();
  const password = String(fd.get('password') || '');
  if (!EMAIL.test(email) || !password) return { message: 'Enter your email and password.' };

  const supabase = getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { message: 'Email or password is incorrect.' };
  redirect(safeNext(text(fd, 'next')));
}

export async function submitProductReviewAction(_prev, fd) {
  const productId = text(fd, 'product_id');
  const rating = Number(fd.get('rating'));
  const title = text(fd, 'title');
  const body = text(fd, 'body');

  if (!productId) return { message: 'This product could not be identified. Refresh and try again.' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { message: 'Choose a star rating before submitting.' };
  if (title.length > 100) return { message: 'Keep your review title under 100 characters.' };
  if (body.length < 10) return { message: 'Write at least 10 characters about your experience.' };
  if (body.length > 2000) return { message: 'Keep your review under 2,000 characters.' };

  const supabase = getSupabaseServer();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { message: 'Sign in with a customer account to leave a review.' };

  const [{ data: profile, error: profileError }, { data: product, error: productError }] = await Promise.all([
    supabase.from('profiles').select('role,status').eq('id', user.id).maybeSingle(),
    supabase.from('products').select('slug').eq('id', productId).eq('status', 'PUBLISHED').maybeSingle(),
  ]);
  if (profileError || productError) return { message: 'We could not verify this review. Please try again.' };
  if (!profile || profile.role !== 'customer' || profile.status !== 'ACTIVE') {
    return { message: 'Only active customer accounts can submit product reviews.' };
  }
  if (!product) return { message: 'This watch is not available for reviews.' };

  const { error } = await supabase.from('reviews').insert({
    product_id: productId,
    customer_id: user.id,
    rating,
    title: title || null,
    body,
    status: 'PENDING',
  });

  if (error?.code === '23505') return { message: 'You have already submitted a review for this watch.' };
  if (error) return { message: 'We could not submit your review. Please try again.' };

  revalidatePath(`/products/${product.slug}`);
  return { ok: 'Thank you! Your review was submitted and will appear after approval.' };
}

export async function registerAction(_prev, fd) {
  const first = text(fd, 'first_name');
  const last = text(fd, 'last_name') || first;
  const email = text(fd, 'email').toLowerCase();
  const phoneRaw = text(fd, 'phone');
  const password = String(fd.get('password') || '');
  const errors = {};
  if (first.length < 2) errors.first_name = 'Enter your first name.';
  if (!EMAIL.test(email)) errors.email = 'Enter a valid email address.';
  if (phoneRaw && !normalizePkPhone(phoneRaw)) errors.phone = 'Enter a Pakistani number, for example 0300 1234567.';
  if (password.length < 8) errors.password = 'Use at least 8 characters.';
  if (Object.keys(errors).length) return { errors };

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: first, last_name: last, phone: phoneRaw ? normalizePkPhone(phoneRaw) : null },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/account`,
    },
  });
  if (error) return { message: /already registered|already exists/i.test(error.message)
    ? 'An account with this email already exists. Try signing in.'
    : authError(error) };
  if (!data.session) return { ok: 'Check your email to confirm your account, then sign in.' };
  redirect(safeNext(text(fd, 'next')));
}

export async function logoutAction() {
  const { error } = await getSupabaseServer().auth.signOut();
  if (error) throw new Error(`Could not sign out: ${error.message}`);
  redirect('/');
}

export async function forgotPasswordAction(_prev, fd) {
  const email = text(fd, 'email').toLowerCase();
  if (!EMAIL.test(email)) return { errors: { email: 'Enter a valid email address.' } };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const returnTo = safeNext(text(fd, 'next'), '/account/login');
  const resetPage = new URL('/account/reset-password', siteUrl);
  resetPage.searchParams.set('returnTo', returnTo);
  const callback = new URL('/auth/callback', siteUrl);
  callback.searchParams.set('next', `${resetPage.pathname}${resetPage.search}`);
  const redirectTo = callback.toString();
  const { error } = await getSupabaseServer().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { message: `Could not send the reset link: ${error.message}` };
  return { ok: 'If an account exists for that email, we have sent a reset link.' };
}

export async function resetPasswordAction(_prev, fd) {
  const code = text(fd, 'code');
  const tokenHash = text(fd, 'token_hash');
  const recovery = text(fd, 'recovery') === '1';
  const returnTo = safeNext(text(fd, 'return_to'), '/account/login');
  const password = String(fd.get('password') || '');
  if (!code && !tokenHash && !recovery) return { message: 'This reset link is not valid. Request a new one.' };
  if (password.length < 8) return { errors: { password: 'Use at least 8 characters.' } };

  const supabase = getSupabaseServer();
  if (tokenHash || code) {
    const verification = tokenHash
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      : await supabase.auth.exchangeCodeForSession(code);
    if (verification.error) return { message: 'This reset link has expired or was already used. Request a new one.' };
  } else {
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();
    if (sessionError || !user) return { message: 'This reset link has expired or was already used. Request a new one.' };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { message: `Could not update your password: ${error.message}` };
  redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}reset=1`);
}

export async function updateProfileAction(_prev, fd) {
  const first = text(fd, 'first_name');
  const last = text(fd, 'last_name') || first;
  const phoneRaw = text(fd, 'phone');
  const errors = {};
  if (first.length < 2) errors.first_name = 'Enter your first name.';
  if (phoneRaw && !normalizePkPhone(phoneRaw)) errors.phone = 'Enter a Pakistani number, for example 0300 1234567.';
  if (Object.keys(errors).length) return { errors };

  const supabase = getSupabaseServer();
  const { data: { user }, error: authErrorResult } = await supabase.auth.getUser();
  if (authErrorResult || !user) return { message: 'Sign in again to update your profile.' };
  const { error } = await supabase.from('profiles').update({
    first_name: first,
    last_name: last,
    phone: phoneRaw ? normalizePkPhone(phoneRaw) : null,
  }).eq('id', user.id);
  if (error) return { message: `Could not save your profile: ${error.message}` };
  revalidatePath('/account');
  return { ok: 'Profile saved.' };
}

export async function saveAddressAction(_prev, fd) {
  const id = text(fd, 'id') || null;
  const firstName = text(fd, 'first_name');
  const phone = normalizePkPhone(text(fd, 'phone'));
  const address = {
    label: text(fd, 'address_name') || null,
    first_name: firstName,
    last_name: text(fd, 'last_name') || firstName,
    address_line1: text(fd, 'address_1'),
    address_line2: text(fd, 'address_2') || null,
    city: text(fd, 'city'),
    postal_code: text(fd, 'postal_code') || null,
    country_code: 'PK',
    phone,
    is_default: fd.get('is_default') === 'on',
  };
  const errors = {};
  if (firstName.length < 2) errors.first_name = 'Enter a first name.';
  if (address.address_line1.length < 6) errors.address_1 = 'Enter the full address.';
  if (address.city.length < 2) errors.city = 'Enter the city.';
  if (!phone) errors.phone = 'Enter a Pakistani number, for example 0300 1234567.';
  if (address.postal_code && !/^\d{5}$/.test(address.postal_code)) errors.postal_code = 'Postal codes have 5 digits.';
  if (Object.keys(errors).length) return { errors };

  const { error } = await getSupabaseServer().rpc('save_customer_address', {
    p_address: address,
    p_id: id,
  });
  if (error) return { message: `Could not save your address: ${error.message}` };
  revalidatePath('/account/addresses');
  return { ok: 'Address saved.', done: Date.now() };
}

export async function deleteAddressAction(fd) {
  const id = text(fd, 'id');
  if (!id) return;
  const supabase = getSupabaseServer();
  const { data: { user }, error: authErrorResult } = await supabase.auth.getUser();
  if (authErrorResult || !user) throw new Error('Sign in again to delete this address.');
  const { error } = await supabase.from('addresses').delete().eq('id', id).eq('customer_id', user.id);
  if (error) throw new Error(`Could not delete address: ${error.message}`);
  revalidatePath('/account/addresses');
}

export async function placeOrderAction(order) {
  const address = order?.shippingAddress;
  const items = Array.isArray(order?.items) ? order.items : [];
  if (!address || !items.length || !order.idempotencyKey) {
    throw new Error('Checkout information is incomplete. Review your cart and delivery details.');
  }
  const { data, error } = await getSupabaseServer().rpc('checkout_order', {
    p_items: items.map(({ variantId, quantity }) => ({ variantId, quantity })),
    p_contact_email: order.contactEmail,
    p_shipping_first_name: address.firstName,
    p_shipping_last_name: address.lastName,
    p_shipping_address1: address.address1,
    p_shipping_address2: address.address2 || null,
    p_shipping_city: address.city,
    p_shipping_region: address.region || null,
    p_shipping_postal_code: address.postalCode || null,
    p_shipping_phone: address.phone,
    p_order_notes: order.orderNotes || null,
    p_discount_code: order.discountCode || null,
    p_idempotency_key: order.idempotencyKey,
  });
  if (error) throw new Error(`Could not place order: ${error.message}`);
  revalidatePath('/account/orders');
  return data;
}
