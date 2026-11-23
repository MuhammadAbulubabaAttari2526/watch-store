import { afterEach, describe, expect, it, vi } from 'vitest';

const { requireAdmin, getSupabasePasswordVerifier, getSupabaseServer, signInWithPassword, updateUser } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getSupabasePasswordVerifier: vi.fn(),
  getSupabaseServer: vi.fn(),
  signInWithPassword: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock('@/lib/admin/server', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ getSupabasePasswordVerifier, getSupabaseServer }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { changeAdminPasswordAction } from '@/lib/admin/actions';

function formData(currentPassword, newPassword, confirmPassword = newPassword) {
  const form = new FormData();
  form.set('current_password', currentPassword);
  form.set('new_password', newPassword);
  form.set('confirm_password', confirmPassword);
  return form;
}

afterEach(() => {
  requireAdmin.mockReset();
  getSupabasePasswordVerifier.mockReset();
  getSupabaseServer.mockReset();
  signInWithPassword.mockReset();
  updateUser.mockReset();
});

describe('admin password change', () => {
  it('requires the current password to be correct before updating', async () => {
    requireAdmin.mockResolvedValue({ id: 'admin-id', email: 'admin@example.com' });
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: { code: 'invalid_credentials' } });
    getSupabasePasswordVerifier.mockReturnValue({ auth: { signInWithPassword } });

    await expect(changeAdminPasswordAction({}, formData('wrong', 'new-password-123')))
      .resolves.toEqual({ message: 'Current password is incorrect.' });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('rejects mismatched new passwords without verifying credentials', async () => {
    requireAdmin.mockResolvedValue({ id: 'admin-id', email: 'admin@example.com' });

    await expect(changeAdminPasswordAction({}, formData('current', 'new-password-123', 'different-password')))
      .resolves.toEqual({ message: 'The new passwords do not match.' });
    expect(getSupabasePasswordVerifier).not.toHaveBeenCalled();
  });

  it('updates the password only for the verified admin session', async () => {
    requireAdmin.mockResolvedValue({ id: 'admin-id', email: 'admin@example.com' });
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null });
    updateUser.mockResolvedValue({ error: null });
    getSupabasePasswordVerifier.mockReturnValue({ auth: { signInWithPassword } });
    getSupabaseServer.mockReturnValue({ auth: { updateUser } });

    await expect(changeAdminPasswordAction({}, formData('current-password', 'new-password-123')))
      .resolves.toEqual({ ok: 'Password changed successfully.' });
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'admin@example.com', password: 'current-password' });
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
  });
});
