# Supabase and Vercel deployment

The Next.js storefront uses Supabase directly through the public anon/publishable key and server-side user sessions. Postgres RLS and checked database functions protect customer data, admin operations, checkout pricing, and inventory. The legacy Express/Prisma backend remains in `custom-backend/`; it is not part of this deployment and is intentionally not deleted before data migration and cutover.

## 1. Create and configure Supabase

1. Create a Supabase project and note its project URL and public anon key (or publishable key). Never use a `service_role` key in a browser, a `NEXT_PUBLIC_*` variable, or Vercel.
2. Install/use the Supabase CLI, then run from the repository root:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   Review the target project and migration output before applying it. The SQL migration creates the relational schema, role and order functions, RLS policies, and public `product-images` and `store-assets` buckets with admin-only upload policies.
3. In Supabase Auth URL Configuration:
   - Set the local Site URL to `http://localhost:3000` while developing.
   - Add `http://localhost:3000/auth/callback` to the redirect allow list.
   - Before production, set the Site URL to the Vercel storefront URL and add its exact `/auth/callback` URL. Add a custom domain callback too if one is used.
   - Configure email confirmation and password recovery email templates to use the supplied redirect URL.

## 2. Create the first admin safely

1. Register an account through the storefront, confirm its email, and sign in once so its `profiles` row exists.
2. In the Supabase SQL Editor, check that the email identifies exactly one profile, then promote that profile using the trusted dashboard:

   ```sql
   update public.profiles
   set role = 'admin', status = 'ACTIVE', updated_at = now()
   where email = lower('admin@example.com')
     and role = 'customer';
   ```

   Verify the affected row and sign in through `/admin/login`. Do not add a public role-selection field or let a user update their own role. Additional admins must be promoted only by a trusted project administrator.

## 3. Configure Vercel

1. Import the repository and set the Vercel project Root Directory to `storefront`.
2. Use the `npm` install command `npm ci`; the Next.js build command is `npm run build`, and the output is Next.js-managed.
3. Add these environment variables for Preview and Production as appropriate:

   ```text
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
   NEXT_PUBLIC_SITE_URL=https://YOUR_STOREFRONT_DOMAIN
   NEXT_PUBLIC_WHATSAPP_NUMBER=  # optional, digits with country code
   ```

   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be used instead of the anon-key variable. The storefront supports both. Do not set `NEXT_PUBLIC_API_URL`, database credentials, or a service-role key.
4. Apply the same Supabase migrations to the project before deploying the storefront. Add the final Vercel URL to Supabase Auth's allowed redirects before testing signup or password recovery.

The optional `storefront/Dockerfile` accepts the same public Supabase URL/key, site URL, and WhatsApp number as build arguments and exposes them to the standalone runtime. These are public client configuration values; never pass a service-role key.

## 4. Data and production cutover

- The current migration is schema and function setup, not an import of the existing PostgreSQL/Prisma data. No products, users, orders, carts, or image files are copied automatically.
- Export and back up the existing database and `custom-backend/uploads` before designing an import. Preserve product, variant, SKU, stock, category, collection, order, and timeline identifiers where possible. Map legacy customers to confirmed Supabase Auth user IDs before importing profile-linked records; never import a legacy admin role as trusted without review.
- Migrate image files to the appropriate bucket and update each image URL. Validate SKU uniqueness, order totals, payment status, inventory, customer ownership, and RLS using a staging project.
- Guest carts are browser-local in the new storefront; legacy server carts are not imported.
- Keep the legacy backend, its database, and upload files available until data reconciliation, end-to-end testing, and an explicitly approved cutover are complete. No destructive operation is part of the current migration.

## Production checklist

- [ ] Apply reviewed migrations to the intended Supabase project and confirm both Storage buckets and policies exist.
- [ ] Confirm RLS is enabled on all application tables; test as anon, customer, and admin accounts.
- [ ] Verify public signup cannot assign or retain admin access and an admin can only be promoted through trusted project administration.
- [ ] Test signup, confirmation, login, logout, password recovery, and allowed redirects.
- [ ] Test admin product creation/edit/archive, image upload/removal, settings and banner updates.
- [ ] Test COD checkout with current pricing, a discount, concurrent stock depletion, idempotent retry, and cancellation/return inventory restoration.
- [ ] Confirm customer accounts cannot read or modify another customer's orders, payment state, totals, stock, or role.
- [ ] Configure production-only public environment values, HTTPS, and the correct auth email/site URLs.
- [ ] Back up and reconcile legacy database and uploads before scheduling any cutover.
