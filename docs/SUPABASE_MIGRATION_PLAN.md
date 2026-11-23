# VELTRIX Supabase migration status

## Starting architecture

The project is a Next.js 14 App Router storefront plus an Express/Prisma backend in `custom-backend/`. The old relational model includes products/variants, inventory, categories/collections, customer accounts and addresses, carts, discounts, COD orders, reviews, newsletter subscriptions, store settings, and locally uploaded files.

## Implemented in the storefront and migration

- Added the Supabase project configuration and a PostgreSQL migration for profiles, catalog and variant data, inventory, customer addresses, discounts, orders/items, payments, order timeline, settings, banners, newsletter subscribers, reviews, and wishlists.
- Added RLS, protected admin functions, public catalog/search functions, transactional server-priced checkout, stock adjustments/restoration, and admin-only Storage upload policies for product images and store assets.
- Replaced storefront catalog, settings, banner, image URL, local cart, shipping preview, discount validation, Auth, customer profile/address/order, newsletter, checkout, admin catalog, order/status/payment, inventory, and store settings access with Supabase-backed flows.
- Added admin product editing and image handling, admin order details/status/payment actions, customer lookup/details/status management, review moderation, inventory history, store settings, banners, category/collection management, and discount-code management without replacing the existing storefront design.
- Added deployment and staging-test instructions. Removed unused Neon tooling/dependencies and the storefront's unused generic custom-API client.
- Validation completed locally: the storefront test suite passes (62 tests), the Supabase environment check passes with the current local configuration, and the Next.js production build succeeds.
- The production Supabase schema migration has been applied successfully. Post-migration verification found 22 public VELTRIX tables, 7 public enum types, 2 Storage buckets, 46 public RLS policies, and 4 Storage policies.
- The configured admin email was confirmed in Supabase Auth and its profile was promoted to `admin`/`ACTIVE`. The signed-out admin login route now renders successfully; password sign-in and protected dashboard operations remain unverified.

## Remaining work and blockers

- **Production admin account bootstrap is complete, but live admin sign-in and protected dashboard operations have not yet been verified.** Broader RLS behavior, SQL function runtime semantics, Storage uploads, customer Auth callbacks, and transactional checkout still require live verification.
- **Legacy data and uploads have not been transferred.** A local-only migration-export command now writes a repeatable-read snapshot of application rows (excluding password hashes), upload files, SHA-256 image checksums, and row counts under the ignored `custom-backend/backups/` directory. This is not a full database backup. A Supabase importer is still pending; customer-to-Auth identity mapping and order/image reconciliation must be rehearsed on staging first.
- Obsolete Express API runtime, routes, middleware, server entrypoint, Docker setup, seed/migration files, local `.env`, and generated `node_modules` have been removed. The legacy Prisma schema and migration export/upload tooling are retained because legacy data has not yet been reconciled; removing those retained data-bearing/upload files requires a separate verified backup and explicit approval.
- Legacy multi-role admin users and permissions are not mapped to Supabase's simpler admin/customer roles. Customer review submission is not exposed as a new storefront workflow.
- Disabling a customer blocks app profile access and customer RLS operations, but does not ban the identity from Supabase Auth itself.
- Online payment processing is not part of the current storefront's existing COD workflow.

## Safe next steps

1. Sign in through `/admin/login` with the rotated password and verify dashboard access, then test admin/customer RLS using isolated records.
2. Create and test a restorable full legacy database backup. Then run `npm run data:export` from `custom-backend/`, protect the resulting PII-containing export, define and rehearse ID/identity mappings, and reconcile counts and totals.
3. If a separate disposable staging project becomes available, rehearse Auth, Storage, checkout, and RLS tests there before further production writes.
4. Complete end-to-end/responsive testing and establish backups and rollback.
5. Only after explicit cutover approval, import/reconcile production data; retain a recoverable legacy backup before retiring remaining legacy assets.

No destructive database operation or live production cutover has been performed.
