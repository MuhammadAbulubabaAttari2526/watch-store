# VELTRIX setup (Roman Urdu)

VELTRIX ka storefront Next.js par hai aur ab storefront data ke liye Supabase istemal karta hai. Purana Express/Prisma runtime `custom-backend/` se hata diya gaya hai; schema aur upload/migration assets sirf approved legacy data transfer aur reconciliation ke liye rakhe gaye hain.

## 1. Supabase tayyar karein

1. Supabase project banayein. Dashboard se project URL aur public anon/publishable key lein.
2. Supabase Auth URL Configuration mein local callback `http://localhost:3000/auth/callback` allow karein.
3. Repository ke root se CLI chala kar project link aur migration apply karein:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   Migration database tables, RLS policies, checkout functions aur `product-images` / `store-assets` buckets banati hai. Apply karne se pehle target project ko zaroor check karein.

## 2. Storefront chalayein

```powershell
cd .\storefront
Copy-Item .env.example .env.local
notepad .env.local
```

`.env.local` mein `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ya `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) aur `NEXT_PUBLIC_SITE_URL=http://localhost:3000` set karein. Supabase `service_role` key kabhi frontend ya `NEXT_PUBLIC_*` variable mein na rakhein.

```powershell
npm ci
npm run dev
```

Browser mein `http://localhost:3000` kholein.

## 3. Admin account

Storefront se account register aur confirm karein. Supabase SQL Editor mein email ke zariye apne account ko verify karke admin role trusted tareeqe se assign karein; SQL ka example [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) mein hai. Public signup se admin role nahin mil sakta.

## 4. Tests aur deployment

`storefront` directory se:

```powershell
npm test
npm run check
npm run build
```

Vercel par Root Directory `storefront` rakhein aur required public Supabase environment values configure karein. Production Auth callback URLs ko Supabase mein allow karna yaad rakhein. Tafseel [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) aur staging test checklist [docs/TESTING.md](docs/TESTING.md) mein hai.

Abhi legacy database, products, customers ya uploaded images Supabase par import nahin huay aur live Supabase staging tests nahin huay. Purane backend ya data ko cutover approval, backup aur verification ke baghair delete na karein.
