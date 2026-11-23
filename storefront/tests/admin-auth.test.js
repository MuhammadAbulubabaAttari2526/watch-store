import { afterEach, describe, expect, it, vi } from 'vitest';

const { getUser, from } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: () => ({
    auth: { getUser },
    from,
  }),
}));

import { getAdmin } from '@/lib/admin/server';

afterEach(() => {
  getUser.mockReset();
  from.mockReset();
});

describe('admin authentication', () => {
  it('treats a missing session as a signed-out user', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthSessionMissingError', message: 'Auth session missing!' },
    });

    await expect(getAdmin()).resolves.toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it('continues to surface unexpected authentication errors', async () => {
    getUser.mockResolvedValue({
      data: { user: null },
      error: { name: 'AuthApiError', message: 'Auth service unavailable' },
    });

    await expect(getAdmin()).rejects.toThrow('Could not verify admin session: Auth service unavailable');
  });
});
