import { afterEach, describe, expect, it, vi } from 'vitest';

const { getSupabaseServer, exchangeCodeForSession, verifyOtp } = vi.hoisted(() => ({
  getSupabaseServer: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({ getSupabaseServer }));

import { GET } from '@/app/auth/callback/route';

afterEach(() => {
  getSupabaseServer.mockReset();
  exchangeCodeForSession.mockReset();
  verifyOtp.mockReset();
});

describe('auth callback password recovery', () => {
  it('preserves the recovery session when consuming a code-based admin reset link', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    getSupabaseServer.mockReturnValue({ auth: { exchangeCodeForSession, verifyOtp } });
    const request = new Request(
      'https://veltrix.example/auth/callback?code=one-time-code&next=%2Faccount%2Freset-password%3FreturnTo%3D%252Fadmin%252Flogin',
    );

    const response = await GET(request);
    const destination = new URL(response.headers.get('location'));

    expect(destination.pathname).toBe('/account/reset-password');
    expect(destination.searchParams.get('recovery')).toBe('1');
    expect(destination.searchParams.get('returnTo')).toBe('/admin/login');
  });
});
