# MyRoom — เวอร์ชันใหม่ (Next.js + Supabase + PWA)

กำลังย้ายจากแอปไฟล์เดียว (`public/legacy/index.html`) มาเป็นแอปจริง แบบ **ค่อยเป็นค่อยไป** (strangler-fig) — ของเดิมยังใช้งานได้ที่ `/legacy/index.html` จนกว่าเวอร์ชันใหม่จะครบ

## Stack
- **Next.js 15 (App Router) + React 19 + TypeScript**
- **Tailwind CSS v4**
- **Supabase** (Auth + Postgres ตารางจริง) ผ่าน `@supabase/ssr`
- เป้าหมาย: **PWA** ติดตั้งบนมือถือ + deploy บน **Vercel**

## เริ่มใช้งาน (dev)
```bash
cp .env.example .env.local   # ใส่ค่า Supabase URL / anon key
npm install
npm run dev                  # http://localhost:3000
```

## ฐานข้อมูล
- รัน `supabase/schema-v3.sql` ใน Supabase SQL Editor (สร้างตารางจริง + RLS + ฟังก์ชัน migration)
- ตารางใหม่ "อยู่ร่วม" กับ `app_state` เดิมได้ระหว่างเปลี่ยนผ่าน
- ย้ายข้อมูลเก่า: `select public.migrate_app_state(auth.uid());` (idempotent รันซ้ำได้)

## โครงสร้าง
```
app/            หน้า (App Router) — / , /login (ต่อ: rooms, meters, expenses, summary, invoices, settings)
lib/supabase/   client.ts (browser) · server.ts (RSC/actions) · middleware.ts (refresh session)
middleware.ts   กั้นหน้าให้ต้องล็อกอิน (ยกเว้น /legacy)
supabase/       schema-v3.sql (schema จริง + migration)
public/legacy/  แอปเดิม (ไฟล์เดียว) — ใช้งานได้ที่ /legacy/index.html
```

## สถานะ (Phase 0)
- [x] Scaffold + Tailwind + Supabase ssr clients + auth middleware + หน้า login
- [x] ย้ายแอปเดิมเป็น `/legacy`
- [x] Schema ตารางจริง + migration function
- [ ] ไอคอน PWA (`public/icons/*`) + service worker (offline)
- [ ] พอร์ตหน้า: ตั้งค่า → ภาพรวม → สรุป → ห้องพัก → มิเตอร์ → รายจ่าย → ใบแจ้ง A5 → สำรองข้อมูล
- [ ] รันสคริปต์ migration จริง + cut over

## Deploy (Vercel)
- Vercel จะ auto-detect Next.js (Framework Preset = Next.js, build = `next build`) — แก้ปัญหาเดิมที่เป็น static แล้วไม่ build
- ตั้ง env บน Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
