# VELTRIX

VELTRIX is a Next.js watch storefront paired with its custom Express/Prisma API in `custom-backend/`.

## Run locally

1. Use a local PostgreSQL database named `veltrix_custom`, or configure Neon. Neon setup writes the pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED` connection strings to the repository-root `.env.local`; the backend loads those alongside `custom-backend/.env`.
2. Configure and start the API:

   ```powershell
   cd custom-backend
   Copy-Item .env.example .env
   # Edit .env: set DATABASE_URL, a unique JWT_SECRET, and admin credentials.
   npm ci
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   npm run dev
   ```

3. In a second terminal, configure and start the storefront:

   ```powershell
   cd storefront
   Copy-Item .env.example .env.local
   # Set NEXT_PUBLIC_API_URL=http://localhost:4000 in .env.local.
   npm ci
   npm run dev
   ```

Open `http://localhost:3000`. The API listens on port 4000. Set `CORS_ORIGIN` in the backend `.env` to the exact storefront origin when deploying.

The backend uses Prisma’s `node-postgres` adapter with pooled `DATABASE_URL` for application queries and the direct `DATABASE_URL_UNPOOLED` for migrations.

The backend currently supports the catalog, carts, discounts, COD checkout, newsletter, and customer account/order endpoints used by the storefront. Online payments and password reset are not implemented.

## Checks

From `storefront/`:

```powershell
npm test
npm run check
npm run build
```

With the backend and database running, from `custom-backend/` run `npm run test:smoke` to exercise API flows. See [docs/TESTING.md](docs/TESTING.md) and [GUIDE_ROMAN_URDU.md](GUIDE_ROMAN_URDU.md).
