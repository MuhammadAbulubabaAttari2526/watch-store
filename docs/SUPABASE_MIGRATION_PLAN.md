# VELTRIX Supabase Migration Plan

## Current architecture

- The storefront is a Next.js 14 App Router application in `storefront/`.
- The custom API is an Express application in `custom-backend/`, backed by PostgreSQL and Prisma.
- The database already models product variants, categories, collections, inventory, customer addresses, carts, orders, discounts, reviews, store settings, newsletter subscribers, and admin roles/permissions.
- The storefront calls the API for product catalog, cart and shipping operations. Next.js server actions proxy customer authentication, profile, address, checkout, order history, and admin operations.
- The API implements catalog and admin product management, inventory, analytics, order management, discounts, newsletter, settings, review moderation, and uploads to local disk.
- The current deployment guide requires separate storefront/API services and a PostgreSQL database. The storefront has no Supabase SDK dependency or Supabase project configuration.

## Migration sequence

1. **Establish Supabase configuration and database security.** Add a reusable Supabase client, Supabase CLI configuration, a non-destructive SQL migration based on the existing relational model, and RLS policies. Put authoritative checkout, inventory, and role changes behind database functions with permission checks. Do not copy data, apply migrations to a live project, or remove the current API without an explicitly configured Supabase project and verified cutover.
2. **Replace catalog and public store reads.** Migrate storefront product, category, collection, public settings, banners, and image URL reads to Supabase while preserving the existing mapper and page interfaces.
3. **Migrate authentication and customer data.** Replace API-backed customer sessions with Supabase Auth sessions; migrate profile, address, and customer-owned order access. Establish admin role assignment outside public signup and enforce it in RLS and privileged database functions.
4. **Migrate cart and checkout.** Preserve cart UX and persistence. Use trusted database pricing, discount, stock, and idempotency checks in one transaction for order placement; validate COD workflow and stock restoration on cancellation.
5. **Migrate admin functionality.** Move product and image management, inventory, orders, settings, analytics, discounts, customers, reviews, newsletter administration, and upload operations. Preserve current authorization boundaries and UI.
6. **Verify and prepare deployment.** Update environment examples, setup checks, tests, and Vercel/Supabase instructions. Run available tests/build and test database RLS/transaction behavior on a configured project.
7. **Retire the custom backend only after successful cutover.** Keep its source, Prisma migrations, and upload files intact until data transfer, feature parity, and production verification have succeeded. Deletion or destructive data operations require an explicit approved cutover.

## Scope and verification checkpoints

- Preserve the Next.js pages, components, styles, responsive behavior, and currently implemented features; do not introduce fake production products.
- Implement schema and security first; inspect resulting SQL and run local storefront tests/build before proceeding to live-project validation.
- This workspace currently provides no Supabase URL or public key in the documented example configuration. Live authentication, storage, RLS execution, data migration, and end-to-end testing therefore require project configuration and must not be reported as verified until available.
- Existing backend APIs for password reset, online payment processing, and some rich admin functions are absent or not exposed by the current storefront. Do not claim those pre-existing capabilities were migrated without evidence.
