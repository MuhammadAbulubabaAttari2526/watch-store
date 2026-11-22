import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';

const safeNext = (value) => value && value.startsWith('/') && !value.startsWith('//') ? value : '/account';

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const supabase = getSupabaseServer();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error('The authentication link is incomplete.') };
  if (result.error) {
    return NextResponse.redirect(new URL('/account/login?authError=1', request.url));
  }

  let destination = safeNext(url.searchParams.get('next'));
  if (type === 'recovery') destination = '/account/reset-password?recovery=1';
  return NextResponse.redirect(new URL(destination, request.url));
}
