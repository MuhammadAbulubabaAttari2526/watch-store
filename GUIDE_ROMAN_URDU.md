# VELTRIX setup (Roman Urdu)

VELTRIX mein Next.js storefront aur apna custom Express/Prisma backend shamil hain.

## Zaroori cheezein

- Node.js LTS aur npm
- PostgreSQL
- VS Code ya koi code editor

## 1. Database aur backend

PostgreSQL mein `veltrix_custom` naam ka database banayein. Phir PowerShell mein:

```powershell
cd .\custom-backend
Copy-Item .env.example .env
notepad .env
```

`.env` mein `DATABASE_URL` ka password sahi karein, `JWT_SECRET` ko kam az kam 32 characters ka random secret dein, aur `SUPER_ADMIN_EMAIL` aur `SUPER_ADMIN_PASSWORD` ko apni values se badlein. Asli `.env` kisi ke saath share ya commit na karein.

```powershell
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Backend `http://localhost:4000` par chalega. Database migrations aur admin user tayyar karne ke liye `db:deploy` aur `db:seed` zaroor chalayen.

## 2. Storefront

Doosre PowerShell mein:

```powershell
cd .\storefront
Copy-Item .env.example .env.local
notepad .env.local
```

`NEXT_PUBLIC_API_URL=http://localhost:4000` rakhein. Chahein to `NEXT_PUBLIC_WHATSAPP_NUMBER` mein country code ke saath digits likhein. Phir:

```powershell
npm ci
npm run dev
```

Browser mein `http://localhost:3000` kholein.

## 3. Tests

`storefront` folder se:

```powershell
npm test
npm run check
npm run build
```

Backend aur database chalte hon to `custom-backend` folder se `npm run test:smoke` chalayen. Test database par hi smoke test chalayein; ye temporary customer, product, cart aur order records banata aur baad mein hata deta hai.

## Ahm baatein

- Online card payments aur password reset abhi implement nahi hain.
- Live karte waqt backend `.env` mein `CORS_ORIGIN` ko apne storefront domain par set karein, aur storefront `NEXT_PUBLIC_API_URL` ko HTTPS API URL karein.
- Product uploads `custom-backend/uploads` mein save hoti hain; deployment par is folder ke liye persistent storage rakhein.
