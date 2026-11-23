import { afterEach, describe, expect, it, vi } from 'vitest';

const { getSupabaseServer, resetPasswordForEmail, getUser, updateUser, exchangeCodeForSession } = vi.hoisted(() => ({
  getSupabaseServer: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  exchangeCodeForSession: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { forgotPasswordAction, resetPasswordAction } from '@/lib/auth/actions';

afterEach(() => {
  getSupabaseServer.mockReset();
  resetPasswordForEmail.mockReset();
  getUser.mockReset();
  updateUser.mockReset();
  exchangeCodeForSession.mockReset();
});

describe('password recovery', () => {
  it('sends admin recovery links back to the password form with an admin return path', async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    getSupabaseServer.mockReturnValue({ auth: { resetPasswordForEmail } });
    const form = new FormData();
    form.set('email', 'admin@example.com');
    form.set('next', '/admin/login');

    await expect(forgotPasswordAction({}, form)).resolves.toEqual({
      ok: 'If an account exists for that email, we have sent a reset link.',
    });

    const [, { redirectTo }] = resetPasswordForEmail.mock.calls[0];
    const callback = new URL(redirectTo);
    expect(callback.pathname).toBe('/auth/callback');
    expect(callback.searchParams.get('next')).toBe('/account/reset-password?returnTo=%2Fadmin%2Flogin');
  });

  it('returns to the admin login after saving the reset password', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'admin-id' } }, error: null });
    updateUser.mockResolvedValue({ error: null });
    getSupabaseServer.mockReturnValue({ auth: { getUser, updateUser } });
    const form = new FormData();
    form.set('password', 'new-password-123');
    form.set('recovery', '1');
    form.set('return_to', '/admin/login');

    await resetPasswordAction({}, form);

    const { redirect } = await import('next/navigation');
    expect(redirect).toHaveBeenCalledWith('/admin/login?reset=1');
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
  });
});
