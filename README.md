# Jumsup — Setup หลังอัป GitHub เสร็จ

> โครงสร้างโปรเจกต์และกติกาการเพิ่มฟีเจอร์: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

เริ่มจากสถานะนี้:
- GitHub มี repo `jumsup`
- Supabase Project `jumsup` สร้างแล้ว
- Migration `001 → 002 → 003 → 004` รัน Success แล้ว
- โปรเจกต์รุ่นนี้เพิ่ม Migration `005_community_engagement.sql` ซึ่งต้องรันอีกหนึ่งครั้ง

เป้าหมายคือเชื่อม:
`GitHub → Supabase → Google Login → Cloudflare → Stripe Test`

## 0) รัน Migration 005 สำหรับ Community

Supabase → SQL Editor → New query แล้วเปิดไฟล์:

```text
supabase/migrations/005_community_engagement.sql
```

คัดลอก SQL ทั้งไฟล์ไป Run หลัง `001 → 004` เพื่อเปิดระบบ Like, Rating/Review และจำนวน Import

## 1) เอา Supabase URL + Key
Supabase → Project `jumsup` → Connect หรือ Settings → API Keys

เอา:
- Project URL
- Publishable key

อย่าใช้ Secret key / service_role ใน frontend

## 2) สร้าง `.env` บนเครื่อง
ใน root ที่มี `package.json`

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
VITE_APP_URL=http://localhost:5173
```

จากนั้น:
```powershell
npm.cmd install
npm.cmd run dev
```

เปิด `http://localhost:5173`

## 3) เปิด Google Login
Supabase → Authentication → Providers → Google → Enable

Copy Callback URL ของ Supabase เช่น:
`https://YOUR_PROJECT.supabase.co/auth/v1/callback`

## 4) สร้าง Google OAuth
Google Cloud Console → Google Auth Platform → OAuth Client → Web application

ใส่ Authorized redirect URI = Callback URL จาก Supabase

Google จะให้:
- Client ID
- Client Secret

เอากลับมาใส่ Supabase → Authentication → Providers → Google แล้ว Save

## 5) ตั้ง Redirect URL สำหรับ Local
Supabase → Authentication → URL Configuration

Site URL:
`http://localhost:5173`

Redirect URLs:
`http://localhost:5173/**`

## 6) ทดสอบ Login
เปิด Jumsup local → Profile → Login with Google

ถ้า login แล้วกลับ Jumsup และ Profile ขึ้นบัญชี = ผ่าน

## 7) ตั้ง Admin
Login บัญชีที่ต้องการเป็น Admin ก่อน 1 ครั้ง แล้ว Supabase → SQL Editor:

```sql
update public.profiles
set role='admin'
where user_id=(
  select id from auth.users where email='YOUR_ADMIN_EMAIL'
);
```

เปลี่ยน `YOUR_ADMIN_EMAIL` เป็นอีเมลจริง แล้ว Logout/Login ใหม่

## 8) ทดสอบ RLS ด้วย 2 บัญชี
Account A สร้าง Private + Public
Account B:
- ห้ามเห็น Private ของ A
- ต้องเห็น Public ของ A
- ห้ามแก้/ลบของ A
- Import Public ได้เป็นสำเนาใหม่

ถ้า B เห็น Private ของ A ให้หยุดก่อน deploy ต่อ

## 9) สร้าง Cloudflare Pages
Cloudflare → Workers & Pages → Create → Pages → Connect to Git → เลือก repo `jumsup`

ตั้ง:
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` หรือว่าง ถ้า `package.json` อยู่ root

## 10) ใส่ Supabase Variables ใน Cloudflare
Cloudflare → Jumsup → Settings → Variables and Secrets

Variables:
- `VITE_SUPABASE_URL` = Supabase Project URL
- `VITE_SUPABASE_ANON_KEY` = Supabase Publishable key
- `VITE_APP_URL` = URL ของ Cloudflare เช่น `https://jumsup.pages.dev`

Server variables/secrets:
- `SUPABASE_URL` = Project URL
- `SUPABASE_ANON_KEY` = Publishable key
- `SUPABASE_SERVICE_ROLE_KEY` = Service role / server secret → **Encrypt**

ห้ามเอา `SUPABASE_SERVICE_ROLE_KEY` ลง GitHub หรือขึ้นต้นด้วย `VITE_`

## 11) Deploy Cloudflare
กด Save and Deploy

เมื่อได้ URL เช่น `https://jumsup.pages.dev`

กลับ Supabase → Authentication → URL Configuration

Site URL:
`https://jumsup.pages.dev`

Redirect URLs:
- `http://localhost:5173/**`
- `https://jumsup.pages.dev/**`

จากนั้น Cloudflare ตั้ง:
- `VITE_APP_URL=https://jumsup.pages.dev`
- `APP_URL=https://jumsup.pages.dev`

Redeploy

## 12) ทดสอบ Google Login บน Cloudflare
เปิดเว็บจริง → Login Google → Refresh → Logout → Login ใหม่

ถ้าผ่าน = Auth production พร้อม

## 13) เริ่ม Stripe Test Mode
Stripe Dashboard → Test/Sandbox mode

สร้าง Product:
`Jumsup Pro`

สร้าง recurring Prices:
- Monthly
- Yearly

เก็บ Price IDs เช่น:
- `price_xxx_monthly`
- `price_xxx_yearly`

## 14) เอา Stripe Secret Key
Stripe → Developers → API keys → Test mode

เอา:
`sk_test_...`

Cloudflare Secret:
`STRIPE_SECRET_KEY=sk_test_...` → Encrypt

เพิ่ม Variables:
- `STRIPE_PRICE_PRO_MONTHLY=price_xxx`
- `STRIPE_PRICE_PRO_YEARLY=price_xxx`

## 15) เปิด Customer Portal
Stripe → Billing → Customer Portal

อย่างน้อยเปิด:
- Update payment method
- Cancel subscription
- View invoices

## 16) สร้าง Stripe Webhook
Stripe → Developers/Workbench → Webhooks → Add destination

Endpoint:
`https://jumsup.pages.dev/api/stripe/webhook`

เลือก event:
- `checkout.session.completed`
- `invoice.paid`
- `payment_intent.succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `refund.created`
- `refund.updated`
- `refund.failed`
- `charge.refunded`
- `charge.dispute.created`
- `charge.dispute.funds_withdrawn`

Save

## 17) เอา Webhook Secret
เปิด webhook ที่สร้าง → Signing secret

จะได้:
`whsec_...`

Cloudflare Secret:
`STRIPE_WEBHOOK_SECRET=whsec_...` → Encrypt

Redeploy

## 18) สรุป Variables/Secrets

Browser/build:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

Server variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_URL`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`

Server secrets (Encrypt):
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## 19) ทดสอบ Pro
Login → Profile → Pro รายเดือน → Stripe Checkout

ใช้ test card:
`4242 4242 4242 4242`

หลังจ่าย:
`Stripe → Webhook → Supabase → Profile = PRO`

ถ้า success page ขึ้นแต่ Pro ไม่ขึ้น ให้เช็ก Webhook deliveries ก่อน

## 20) เมื่อถือว่า Setup พื้นฐานเสร็จ
ต้องผ่าน:
- Google Login local
- Admin
- RLS 2 accounts
- Cloudflare deploy
- Google Login online
- Stripe Test Checkout
- Customer Portal
- Stripe Webhook

หลังจากนี้ค่อยไปต่อ Referral, Refund, Domain, WAF และ Stripe Live

## ลำดับที่คุณต้องทำตอนนี้
เพราะ SQL 001–004 เสร็จแล้ว ให้รัน `005_community_engagement.sql` ก่อน แล้วทำตามนี้:

1. Supabase → Copy Project URL
2. Supabase → Copy Publishable key
3. สร้าง `.env`
4. Google OAuth
5. Test Login local
6. ตั้ง Admin
7. Test 2 accounts/RLS
8. Cloudflare → Connect GitHub
9. ใส่ Supabase Variables/Secrets
10. Deploy
11. เปลี่ยน Supabase Site URL
12. Test Login online
13. Stripe Test Product
14. Stripe Test Secret
15. Stripe Price IDs
16. Customer Portal
17. Stripe Webhook
18. Webhook Secret
19. Redeploy
20. Test Pro
