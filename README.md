# VELTRIX

VELTRIX is a Next.js 14 watch storefront. Its active storefront backend uses Supabase for PostgreSQL, Auth, Storage, and row-level security. The obsolete Express/Prisma runtime has been removed from `custom-backend/`; only the legacy Prisma schema and migration/export/upload assets retained for approved data transfer remain.

## Set up the storefront

1. Create a Supabase project and configure the Auth redirect URLs described in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
2. Apply the database migration from the repository root:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   The migration creates the commerce schema, RLS policies, checkout functions, and the `product-images` and `store-assets` Storage buckets.
3. Configure and run the storefront:

   ```powershell
   cd storefront
   Copy-Item .env.example .env.local
   # Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
   npm ci
   npm run dev
   ```

   Open `http://localhost:3000`.

4. Create an account through the storefront, confirm it, then promote the intended administrator in the Supabase SQL Editor using the safe bootstrap procedure in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Do not expose a Supabase `service_role` key in the storefront or Vercel environment variables. Never promote an admin through public signup or user-editable profile fields.

## Validation

Run from `storefront/`:

```powershell
npm test
npm run check
npm run build
```

See [docs/TESTING.md](docs/TESTING.md) for what has been verified locally and the live Supabase checks still required. See [docs/SUPABASE_MIGRATION_PLAN.md](docs/SUPABASE_MIGRATION_PLAN.md) for the migration status and remaining cutover work.

## Legacy backend and data

The Supabase migration has been applied successfully to the configured production project. Legacy data and uploaded files have not yet been copied or reconciled. Retain `custom-backend/`, its database, and its uploads until a backup, explicit data mapping/import, reconciliation, and cutover have been approved.
