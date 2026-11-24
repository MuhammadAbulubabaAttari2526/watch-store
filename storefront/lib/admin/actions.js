'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabasePasswordVerifier, getSupabaseServer } from '@/lib/supabase/server';
import { requireAdmin } from './server';

const text = (fd, key) => String(fd.get(key) ?? '').trim();
const ORDER_STATUSES = new Set(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED']);
const PRODUCT_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const PAYMENT_STATUSES = new Set(['PENDING', 'PAID', 'FAILED', 'REFUNDED']);

export async function adminLoginAction(_prev, fd) {
  const email = text(fd, 'email').toLowerCase();
  const password = String(fd.get('password') || '');
  if (!email || !password) return { message: 'Enter your email and password.' };

  const supabase = getSupabaseServer();
  const { data: { user }, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError || !user) return { message: 'Email or password is incorrect.' };
  const { data: profile, error } = await supabase.from('profiles').select('role,status').eq('id', user.id).maybeSingle();
  if (error) {
    await supabase.auth.signOut();
    return { message: `Could not verify admin permissions: ${error.message}` };
  }
  if (!profile || profile.role !== 'admin' || profile.status !== 'ACTIVE') {
    await supabase.auth.signOut();
    return { message: 'This account does not have administrator access.' };
  }
  redirect('/admin');
}

export async function adminLogoutAction(_prev, _fd) {
  const { error } = await getSupabaseServer().auth.signOut();
  if (error) return { error: `Could not sign out: ${error.message}` };
  redirect('/admin/login');
}

export async function changeAdminPasswordAction(_prev, fd) {
  const admin = await requireAdmin();
  const currentPassword = String(fd.get('current_password') ?? '');
  const newPassword = String(fd.get('new_password') ?? '');
  const confirmPassword = String(fd.get('confirm_password') ?? '');

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { message: 'Enter your current password and the new password twice.' };
  }
  if (newPassword.length < 8) return { message: 'Use at least 8 characters for the new password.' };
  if (newPassword !== confirmPassword) return { message: 'The new passwords do not match.' };
  if (newPassword === currentPassword) return { message: 'Choose a new password different from your current one.' };

  const { data: { user }, error: verifyError } = await getSupabasePasswordVerifier().auth.signInWithPassword({
    email: admin.email,
    password: currentPassword,
  });
  if (verifyError) {
    if (verifyError.code === 'invalid_credentials') return { message: 'Current password is incorrect.' };
    return { message: `Could not verify the current password: ${verifyError.message}` };
  }
  if (!user || user.id !== admin.id) return { message: 'Could not verify this administrator account.' };

  const { error } = await getSupabaseServer().auth.updateUser({ password: newPassword });
  if (error) return { message: `Could not change password: ${error.message}` };
  return { ok: 'Password changed successfully.' };
}

export async function updateOrderStatusAction(_prev, fd) {
  const id = text(fd, 'id');
  const status = text(fd, 'status');
  if (!id || !ORDER_STATUSES.has(status)) return { error: 'Choose a valid order status.' };
  const { error } = await getSupabaseServer().rpc('update_order_status', {
    p_order_id: id,
    p_status: status,
    p_note: text(fd, 'note') || null,
  });
  if (error) return { error: `Could not update order status: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath(`/admin/orders/${encodeURIComponent(id)}`);
  return { ok: 'Order status updated.' };
}

export async function updatePaymentStatusAction(_prev, fd) {
  const id = text(fd, 'id');
  const status = text(fd, 'status');
  if (!id || !PAYMENT_STATUSES.has(status)) return { error: 'Choose a valid payment status.' };
  const { error } = await getSupabaseServer().rpc('update_payment_status', {
    p_order_id: id,
    p_payment_status: status,
  });
  if (error) return { error: `Could not update payment status: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath(`/admin/orders/${encodeURIComponent(id)}`);
  return { ok: 'Payment status updated.' };
}

export async function updateCustomerStatusAction(_prev, fd) {
  await requireAdmin();
  const id = text(fd, 'id');
  const status = text(fd, 'status');
  if (!id || !['ACTIVE', 'DISABLED'].includes(status)) return { message: 'Choose a valid customer status.' };
  const { data, error } = await getSupabaseServer().from('profiles')
    .update({ status })
    .eq('id', id)
    .eq('role', 'customer')
    .select('id')
    .maybeSingle();
  if (error) return { message: `Could not update customer: ${error.message}` };
  if (!data) return { message: 'Customer not found or account role cannot be changed here.' };
  revalidatePath('/admin');
  revalidatePath(`/admin/customers/${encodeURIComponent(id)}`);
  return { ok: 'Customer status updated.' };
}

export async function updateReviewStatusAction(_prev, fd) {
  await requireAdmin();
  const id = text(fd, 'id');
  const status = text(fd, 'status');
  if (!id || !['PENDING', 'APPROVED', 'REJECTED'].includes(status)) return { message: 'Choose a valid review status.' };
  const { data, error } = await getSupabaseServer().from('reviews')
    .update({ status })
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) return { message: `Could not moderate review: ${error.message}` };
  if (!data) return { message: 'Review not found.' };
  revalidatePath('/admin');
  revalidatePath('/products');
  return { ok: 'Review status updated.' };
}

export async function updateProductStatusAction(_prev, fd) {
  const id = text(fd, 'id');
  const status = text(fd, 'status');
  if (!id || !PRODUCT_STATUSES.has(status)) return { error: 'Choose a valid product status.' };
  const { error } = await getSupabaseServer().from('products')
    .update({ status, published_at: status === 'PUBLISHED' ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) return { error: `Could not update product status: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath('/products');
  revalidatePath('/');
  return { ok: 'Product status updated.' };
}

export async function saveProductAction(product) {
  await requireAdmin();
  if (!product || typeof product !== 'object') return { error: 'Product details are missing.' };
  const supabase = getSupabaseServer();
  const productId = product.id || null;
  let oldImages = [];
  if (productId) {
    const { data, error } = await supabase.from('product_images').select('url').eq('product_id', productId);
    if (error) return { error: `Could not load existing product images: ${error.message}` };
    oldImages = (data || []).map((image) => image.url);
  }
  const { data, error } = await supabase.rpc('save_product', { p_product: product });
  if (error) return { error: `Could not save product: ${error.message}` };
  const retained = new Set((product.images || []).map((image) => image.url));
  const removedPaths = oldImages.filter((url) => !retained.has(url)).map(storagePath).filter(Boolean);
  if (removedPaths.length) {
    const { error: storageError } = await supabase.storage.from('product-images').remove(removedPaths);
    if (storageError) return { error: `Product saved, but removed image files could not be deleted: ${storageError.message}` };
  }
  revalidatePath('/admin');
  revalidatePath('/products');
  return { id: data };
}

export async function deleteProductAction(fd) {
  const id = text(fd, 'id');
  if (!id) return { error: 'Product ID is required.' };
  const supabase = getSupabaseServer();
  const { data: images, error: imageError } = await supabase.from('product_images').select('url').eq('product_id', id);
  if (imageError) return { error: `Could not load product images: ${imageError.message}` };
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return { error: `Could not delete product: ${error.message}` };
  const paths = (images || []).map((image) => storagePath(image.url)).filter(Boolean);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from('product-images').remove(paths);
    if (storageError) return { error: `Product deleted, but image files could not be removed: ${storageError.message}` };
  }
  revalidatePath('/admin');
  revalidatePath('/products');
  return { ok: true };
}

export async function adjustInventoryAction(fd) {
  const variantId = text(fd, 'variant_id');
  const deltaText = text(fd, 'delta');
  const delta = Number(deltaText);
  if (!variantId || !deltaText || !Number.isInteger(delta)) return { error: 'Enter a valid stock adjustment.' };
  const { error } = await getSupabaseServer().rpc('adjust_inventory', {
    p_variant_id: variantId,
    p_delta: delta,
    p_note: text(fd, 'note') || null,
  });
  if (error) return { error: `Could not update inventory: ${error.message}` };
  revalidatePath('/admin');
  return { ok: 'Inventory updated.' };
}

export async function saveStoreSettingsAction(_prev, fd) {
  await requireAdmin();
  const supabase = getSupabaseServer();
  const keys = [
    'store_name', 'store_phone', 'store_email', 'store_address', 'whatsapp_number',
    'announcement', 'currency', 'shipping_karachi', 'shipping_nationwide',
    'instagram_url', 'facebook_url', 'youtube_url', 'x_url', 'store_logo_url',
  ];
  const settings = [];
  for (const key of keys) {
    const raw = text(fd, key);
    if (key === 'store_email' && raw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return { message: 'Enter a valid store contact email.' };
    }
    if (key === 'currency' && !/^[A-Z]{3}$/.test(raw)) {
      return { message: 'Currency must be a three-letter ISO code, such as PKR.' };
    }
    if (key === 'currency') {
      try {
        new Intl.NumberFormat('en', { style: 'currency', currency: raw });
      } catch {
        return { message: 'Enter a supported three-letter currency code.' };
      }
    }
    if (key === 'whatsapp_number' && raw && !/^\d{8,15}$/.test(raw)) {
      return { message: 'WhatsApp number must contain 8 to 15 digits, including its country code.' };
    }
    if (['_url', '_logo_url'].some((suffix) => key.endsWith(suffix)) && raw) {
      try {
        const url = new URL(raw);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        return { message: `Enter a valid HTTPS URL for ${key.replaceAll('_', ' ')}.` };
      }
    }
    if (key.startsWith('shipping_')) {
      const amount = Number(raw);
      if (!Number.isFinite(amount) || amount < 0) return { message: 'Delivery charges must be zero or a positive amount.' };
      settings.push({ key, value: amount, is_public: true });
    } else {
      settings.push({ key, value: raw, is_public: true });
    }
  }
  const { data: currentLogo, error: logoReadError } = await supabase.from('store_settings').select('value').eq('key', 'store_logo_url').maybeSingle();
  if (logoReadError) return { message: `Could not read the current logo setting: ${logoReadError.message}` };
  const { error } = await supabase.from('store_settings').upsert(settings, { onConflict: 'key' });
  if (error) return { message: `Could not save store settings: ${error.message}` };
  const previousLogoPath = storagePath(currentLogo?.value, 'store-assets');
  const nextLogoPath = storagePath(text(fd, 'store_logo_url'), 'store-assets');
  if (previousLogoPath && previousLogoPath !== nextLogoPath) {
    const { error: storageError } = await supabase.storage.from('store-assets').remove([previousLogoPath]);
    if (storageError) return { message: `Settings saved, but the previous logo could not be deleted: ${storageError.message}` };
  }
  revalidatePath('/');
  revalidatePath('/checkout');
  revalidatePath('/admin');
  return { ok: 'Store settings saved.' };
}

export async function saveBannerAction(_prev, fd) {
  await requireAdmin();
  const id = text(fd, 'id');
  const title = text(fd, 'title');
  const imageUrl = text(fd, 'image_url');
  const linkUrl = text(fd, 'link_url');
  const position = Number(text(fd, 'position') || 0);
  if (title.length < 2 || !Number.isInteger(position) || position < 0) return { message: 'Enter a banner title and valid display order.' };
  if (!storagePath(imageUrl, 'store-assets')) return { message: 'Upload a banner image to Store Assets first.' };
  if (linkUrl && !linkUrl.startsWith('/') && !/^https:\/\//i.test(linkUrl)) return { message: 'Banner links must be relative paths or HTTPS URLs.' };
  const supabase = getSupabaseServer();
  const row = {
    title,
    image_url: imageUrl,
    link_url: linkUrl || null,
    alt_text: text(fd, 'alt_text') || null,
    position,
    is_active: fd.get('is_active') === 'on',
  };
  const query = id
    ? supabase.from('banners').update(row).eq('id', id)
    : supabase.from('banners').insert(row);
  const { error } = await query;
  if (error) return { message: `Could not save banner: ${error.message}` };
  revalidatePath('/');
  revalidatePath('/admin');
  return { ok: 'Banner saved.', done: Date.now() };
}

export async function deleteBannerAction(_prev, fd) {
  await requireAdmin();
  const id = text(fd, 'id');
  if (!id) return { error: 'Banner ID is required.' };
  const supabase = getSupabaseServer();
  const { data: banner, error: readError } = await supabase.from('banners').select('image_url').eq('id', id).maybeSingle();
  if (readError) return { error: `Could not load banner: ${readError.message}` };
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) return { error: `Could not delete banner: ${error.message}` };
  const path = storagePath(banner?.image_url, 'store-assets');
  if (path) {
    const { error: storageError } = await supabase.storage.from('store-assets').remove([path]);
    if (storageError) return { error: `Banner deleted, but its image could not be removed: ${storageError.message}` };
  }
  revalidatePath('/');
  revalidatePath('/admin');
  return { ok: 'Banner deleted.' };
}

export async function saveTaxonomyAction(_prev, fd) {
  await requireAdmin();
  const type = text(fd, 'type');
  const id = text(fd, 'id');
  const name = text(fd, 'name');
  const slug = text(fd, 'slug').toLowerCase();
  if (!['category', 'collection'].includes(type)) return { message: 'Choose a category or collection.' };
  if (name.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { message: 'Enter a name and a valid lowercase URL handle.' };
  }
  const row = { name, slug, description: text(fd, 'description') || null };
  if (type === 'category') row.parent_id = text(fd, 'parent_id') || null;
  const table = type === 'category' ? 'categories' : 'collections';
  const query = id
    ? getSupabaseServer().from(table).update(row).eq('id', id)
    : getSupabaseServer().from(table).insert(row);
  const { error } = await query;
  if (error) return { message: `Could not save ${type}: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath('/products');
  return { ok: `${type === 'category' ? 'Category' : 'Collection'} saved.`, done: Date.now() };
}

export async function deleteTaxonomyAction(_prev, fd) {
  await requireAdmin();
  const type = text(fd, 'type');
  const id = text(fd, 'id');
  if (!id || !['category', 'collection'].includes(type)) return { message: 'Choose a valid category or collection.' };
  const table = type === 'category' ? 'categories' : 'collections';
  const { error } = await getSupabaseServer().from(table).delete().eq('id', id);
  if (error) return { message: `Could not delete ${type}: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath('/products');
  return { ok: `${type === 'category' ? 'Category' : 'Collection'} deleted.` };
}

export async function saveDiscountAction(_prev, fd) {
  await requireAdmin();
  const id = text(fd, 'id');
  const code = text(fd, 'code').toUpperCase();
  const type = text(fd, 'type');
  const value = Number(text(fd, 'value'));
  const minimumOrder = text(fd, 'minimum_order') ? Number(text(fd, 'minimum_order')) : null;
  const usageLimit = text(fd, 'usage_limit') ? Number(text(fd, 'usage_limit')) : null;
  const startsAt = text(fd, 'starts_at');
  const expiresAt = text(fd, 'expires_at');
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return { message: 'Use 3–32 letters, numbers, dashes, or underscores for the code.' };
  if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(type) || !Number.isFinite(value) || value <= 0
    || (type === 'PERCENTAGE' && value > 100)) {
    return { message: 'Enter a valid discount type and value.' };
  }
  if (minimumOrder !== null && (!Number.isFinite(minimumOrder) || minimumOrder < 0)) {
    return { message: 'Minimum order must be zero or a positive amount.' };
  }
  if (usageLimit !== null && (!Number.isInteger(usageLimit) || usageLimit < 0)) {
    return { message: 'Usage limit must be zero or a positive whole number.' };
  }
  const startDate = startsAt ? new Date(`${startsAt}:00Z`) : null;
  const endDate = expiresAt ? new Date(`${expiresAt}:00Z`) : null;
  if ((startDate && !Number.isFinite(startDate.getTime())) || (endDate && !Number.isFinite(endDate.getTime()))
    || (startDate && endDate && startDate >= endDate)) {
    return { message: 'Enter a valid date range with the start before the expiry.' };
  }
  const row = {
    code, type, value, minimum_order: minimumOrder,
    usage_limit: usageLimit, starts_at: startDate?.toISOString() || null,
    expires_at: endDate?.toISOString() || null, is_active: fd.get('is_active') === 'on',
  };
  const query = id
    ? getSupabaseServer().from('discounts').update(row).eq('id', id)
    : getSupabaseServer().from('discounts').insert(row);
  const { error } = await query;
  if (error) return { message: `Could not save discount: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath('/checkout');
  return { ok: 'Discount saved.', done: Date.now() };
}

export async function deleteDiscountAction(_prev, fd) {
  await requireAdmin();
  const id = text(fd, 'id');
  if (!id) return { message: 'Discount ID is required.' };
  const { error } = await getSupabaseServer().from('discounts').delete().eq('id', id);
  if (error) return { message: `Could not delete discount: ${error.message}` };
  revalidatePath('/admin');
  revalidatePath('/checkout');
  return { ok: 'Discount deleted.' };
}

function storagePath(value, bucket = 'product-images') {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = String(value || '').indexOf(marker);
  return index < 0 ? null : decodeURIComponent(value.slice(index + marker.length));
}
