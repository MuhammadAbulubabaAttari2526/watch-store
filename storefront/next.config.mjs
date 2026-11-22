const apiOrigin = (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL || '').origin; } catch { return ''; } })();
const prod = process.env.NODE_ENV === 'production';

// Browser security rules. Production only, because the dev server needs looser rules.
// If product images come from another host (S3, Cloudinary), https images are already allowed.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  `img-src 'self' data: blob: https: ${apiOrigin}`,
  `connect-src 'self' ${apiOrigin}`,
  "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "object-src 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
export default {
  output: 'standalone', // small self-contained server for Docker
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        ...(prod ? [{ key: 'Content-Security-Policy', value: csp }, { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }] : []),
      ],
    }];
  },
};
