import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { safeInternalPath } from '@/lib/utils/redirects';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const supabase = getSupabaseServer();
  const requested = new URL(safeInternalPath(url.searchParams.get('next')), request.url);
  const isRecovery = type === 'recovery' || requested.pathname === '/account/reset-password';

  if (isRecovery) {
    if (!code && !tokenHash) {
      return NextResponse.redirect(new URL('/account/login?authError=1', request.url));
    }
    const destination = new URL('/account/reset-password', request.url);
    if (code) destination.searchParams.set('code', code);
    if (tokenHash) {
      destination.searchParams.set('token_hash', tokenHash);
      destination.searchParams.set('type', 'recovery');
    }
    const returnTo = requested.pathname === '/account/reset-password'
      ? safeInternalPath(requested.searchParams.get('returnTo'), '/account/login')
      : '/account/login';
    destination.searchParams.set('returnTo', returnTo);
    return NextResponse.redirect(destination);
  }

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('The authentication link is incomplete.') };
  if (result.error) {
    return NextResponse.redirect(new URL('/account/login?authError=1', request.url));
  }

  return NextResponse.redirect(requested);
}
