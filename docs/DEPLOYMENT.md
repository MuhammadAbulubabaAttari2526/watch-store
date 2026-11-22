# Deployment

VELTRIX includes the Next.js storefront and a custom Express/Prisma backend. Deploy them as separate services with a PostgreSQL database.

## Backend

- Set `DATABASE_URL`, a unique `JWT_SECRET` of at least 32 characters, `PORT`, `CORS_ORIGIN`, and unique `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` values.
- Use `npm ci`, `npm run db:generate`, `npm run db:deploy`, and `npm run db:seed` from `custom-backend/`.
- Persist the database and `custom-backend/uploads`; uploaded product images are served from the latter.
- Restrict `CORS_ORIGIN` to the exact storefront origin. Terminate HTTPS at the host or reverse proxy.

## Storefront

Deploy `storefront/` to a Next.js-compatible host. Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_API_URL` to the public storefront and API URLs before building. The API origin is also included in the storefront Content Security Policy for requests and images.

Verify catalog browsing, cart updates, discount validation, COD checkout, account sessions, and order history against the deployed API. Online card payments and password reset are not implemented.
