# Storefront testing

Run commands from `storefront/`:

| Command | What it checks | Requires Supabase project values |
|---|---|---|
| `npm test` | Catalog RPC mapping, product purchase behavior, order tracking, phone/delivery helpers, and contrast | No |
| `npm run check` | Presence and basic validity of the public Supabase URL/key | Yes |
| `npm run build` | Production Next.js compilation, route generation, and build traces | Public values should be configured |

The local unit suite and production build are useful checks, not proof of live Auth, RLS, Storage, SQL-function, or transactional behavior.

## Live staging checklist

Use a disposable Supabase project and non-production test accounts/data:

1. Apply migrations; confirm table RLS and both storage buckets/policies.
2. Create a customer, confirm email, sign in/out, request password recovery, and complete reset using allowed callback URLs.
3. Verify public signup cannot set admin role; verify an ordinary customer is denied admin queries and uploads; promote a staging admin through the Supabase SQL Editor and verify admin operations.
4. Create categories, collections, and discounts in the admin panel. Verify discount limits, minimum order, expiry, enable/disable, and deletion behavior.
5. Create/update/publish/archive a product with variants, SKU, inventory, category, collection, and multiple images. Confirm search/filter/sort and out-of-stock behavior.
6. Search and inspect customers, update active/disabled status, and verify disabled customers cannot read their account data or place new orders.
7. Moderate reviews through pending/approved/rejected states and inspect stock transaction history after edits and order fulfillment.
8. Test customer profile/address ownership, order visibility, and denied cross-customer reads/updates.
9. Submit checkout with valid/invalid discounts, changed browser prices, invalid stock, repeated idempotency key, and concurrent attempts for the last unit. Verify the database-derived total and atomic inventory transaction.
10. Update order and payment status as admin; verify cancellation/return restores stock only once.
11. Test store settings, banner visibility, newsletter subscription, and the mobile storefront layout.
12. Run a legacy export/import rehearsal and reconcile product, variant, order, payment, stock, and image counts before any production cutover.

The configured Supabase project is production. The schema migration and initial admin role bootstrap are complete, but password sign-in and admin dashboard operations have not been verified. Live Auth, RLS, Storage, and checkout test writes must use explicitly approved disposable accounts and isolated test data; do not mark the checklist complete based solely on a successful build.

## Legacy migration export

Before any import rehearsal, create and test a restorable full database backup using the legacy database provider or `pg_dump`. Then configure `DATABASE_URL` and `UPLOAD_DIR` locally in `custom-backend/.env`, and run `npm run data:export` from `custom-backend/`. This command does not write to Supabase. It exports application rows in a repeatable-read transaction without legacy user/customer password hashes and copies the configured uploads directory into an ignored, timestamped `custom-backend/backups/legacy-export-*` folder. Its manifest records row counts and upload SHA-256 hashes for reconciliation. This migration export is not a full or directly restorable database backup and still contains customer/order personal data: keep it access-controlled and encrypted, and do not commit or share it.

Run `npm run test:export` from `custom-backend/` to verify local export file-copy and path-safety behavior. This is not a substitute for restoring the full backup or reconciling a migration.

## Legacy backend tests

The obsolete Express runtime and smoke tests have been removed. `custom-backend/` retains only migration/export/upload assets and the legacy Prisma schema for approved data transfer. Never apply legacy seed data directly to production.
