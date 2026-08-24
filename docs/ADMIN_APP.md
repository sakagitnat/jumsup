# Jumsup Admin App

เว็บผู้ดูแลแยกจากเว็บผู้ใช้ แต่ใช้ Supabase และ Stripe ชุดเดียวกัน

- เว็บหลัก: `https://jumsup.sakagitnat.workers.dev`
- เว็บแอดมิน: `https://jumsup-admin.sakagitnat.workers.dev`
- Build: `npm run build:admin`
- Worker config: `wrangler.admin.toml`

## ตัวแปรของ Worker แอดมิน

Variables:

- `APP_URL=https://jumsup-admin.sakagitnat.workers.dev`
- `SUPABASE_URL=https://vhzpmnirzgrzyaaotcep.supabase.co`
- `SUPABASE_ANON_KEY` — Publishable/anon key (เปิดเผยใน browser ได้ แต่ห้ามใช้แทน RLS)

Encrypted secrets:

- `SUPABASE_SERVER_KEY` — Supabase service role/server key
- `STRIPE_SECRET_KEY` — Stripe Live secret key สำหรับคืนเงิน

เว็บแอดมินไม่ต้องมี Stripe webhook หรือ Price ID เพราะไม่ได้สร้าง Checkout

## Supabase Auth

เพิ่ม Redirect URL:

`https://jumsup-admin.sakagitnat.workers.dev/**`

ผู้ใช้ต้องมี `profiles.role='admin'` จึงเข้าได้ การซ่อนหน้าเว็บไม่ใช่ตัวป้องกันหลัก เพราะทุก Admin API ตรวจ JWT และ role ซ้ำฝั่งเซิร์ฟเวอร์

## ความปลอดภัย

- เว็บหลักไม่มี Admin API และไม่มีเมนู Admin
- เว็บแอดมินตั้ง `noindex`, ป้องกัน iframe และจำกัด CSP
- การคืนเงินและปิด Gift Code ต้องยืนยันซ้ำ
- การอนุมัติ/ปฏิเสธและการสร้าง/ปิดโค้ดบันทึก Audit Log
- Gift Code จำกัดสูงสุด 5,000 Pro-days และ 50 โค้ดที่เปิดใช้
- แนะนำเปิด Cloudflare Access ให้เฉพาะอีเมลเจ้าของ และเปิด 2FA ของ Google/Cloudflare/Supabase/Stripe
