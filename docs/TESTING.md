# Storefront testing

Run commands from the `storefront` directory:

| Command | What it checks | Needs an API? |
|---|---|---|
| `npm test` | Store API client and adapters, phone and delivery helpers, product purchasing behavior, order tracking, and contrast | No |
| `npm run check` | Whether `NEXT_PUBLIC_API_URL` is configured and valid | No |
| `npm run build` | Production Next.js build | No |
| `npm run test:e2e` | Browser flows and responsive layout | Yes for commerce flows |

## Backend smoke test

From `custom-backend/`, run `npm run test:smoke` against a disposable test database after setting `DATABASE_URL`, `SUPER_ADMIN_EMAIL`, and `SUPER_ADMIN_PASSWORD`. It creates temporary records to verify authentication, role permissions, catalog filters, cart stock limits, server-priced COD checkout, stock restoration, and newsletter signup, then cleans them up.

Do not run the smoke test against production data.
