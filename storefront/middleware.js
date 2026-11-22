import { refreshSupabaseSession } from '@/lib/supabase/middleware';

export async function middleware(request) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/).*)',
  ],
};
