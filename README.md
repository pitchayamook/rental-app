# 🏠 MyRoom — ระบบจัดการหอพัก

เว็บแอปจัดการหอพัก (ห้องเช่า, มิเตอร์น้ำ-ไฟ, การชำระเงิน, รายรับ-รายจ่าย, ใบแจ้งค่าเช่า)
เป็นไฟล์ HTML ไฟล์เดียว ไม่ต้อง build เก็บข้อมูลบน **Supabase** + มีระบบ **Login**

---

## 🗂️ ไฟล์ในโปรเจกต์

| ไฟล์ | หน้าที่ |
|------|---------|
| `index.html` | ตัวแอปทั้งหมด |
| `supabase-schema.sql` | สคริปต์สร้างตาราง + ความปลอดภัยใน Supabase |
| `README.md` | คู่มือนี้ |

---

## 🚀 ขั้นตอน Deploy (ทำครั้งเดียว ~20 นาที)

### ขั้นที่ 1 — ตั้งค่า Supabase (ฐานข้อมูล)

1. เข้า https://supabase.com → เปิดโปรเจกต์ของคุณ
2. เมนูซ้าย **SQL Editor** → **New query** → เปิดไฟล์ `supabase-schema.sql` คัดลอกทั้งหมดมาวาง → กด **Run**
   (ได้ตาราง `app_state` + เปิด Row Level Security เรียบร้อย)
3. เมนูซ้าย **Project Settings → API** จดค่า 2 อย่าง:
   - **Project URL** (เช่น `https://abcd1234.supabase.co`)
   - **anon public key** (คีย์ยาว ๆ ขึ้นต้น `eyJ...`)
4. เมนูซ้าย **Authentication → Providers → Email** เปิดใช้งานไว้
   - 💡 ถ้าไม่อยากยืนยันอีเมลตอนสมัคร: ปิด **"Confirm email"** ในหน้านี้ จะ login ได้ทันทีหลังสมัคร

> 🔐 anon key เปิดเผยในหน้าเว็บได้ปลอดภัย เพราะความปลอดภัยมาจาก Row Level Security (ข้อ 2)

### ขั้นที่ 2 — ใส่คีย์ลงในแอป

เปิด `index.html` หาบรรทัด (อยู่บนสุดของ `<script>`):

```js
const SUPABASE_URL      = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";
```

แทนที่ด้วยค่าจริง 2 ค่าจากขั้นที่ 1 แล้วบันทึก

### ขั้นที่ 3 — ขึ้น GitHub

```bash
cd "Rental app"
git init
git add .
git commit -m "MyRoom rental system"
git branch -M main
git remote add origin https://github.com/<ชื่อคุณ>/<ชื่อ-repo>.git
git push -u origin main
```

### ขั้นที่ 4 — Deploy บน Vercel

1. เข้า https://vercel.com → **Add New… → Project**
2. เลือก GitHub repo ที่เพิ่ง push
3. ไม่ต้องตั้งค่า Build อะไร (เป็น static site) กด **Deploy**
4. ได้ลิงก์ใช้งานจริง เช่น `https://your-app.vercel.app`

### ขั้นที่ 5 — สร้างบัญชีผู้ใช้ครั้งแรก

- เปิดเว็บที่ deploy → กด **"สร้างบัญชีใหม่"** → กรอกอีเมล + รหัสผ่าน (≥ 6 ตัว)
- จากนั้นเข้าสู่ระบบได้เลย ข้อมูลจะ sync ขึ้น Supabase อัตโนมัติ

---

## ✅ หลัง deploy แล้วได้อะไร
- เข้าใช้ได้ทุกที่ทุกอุปกรณ์ผ่านลิงก์ Vercel
- ข้อมูลอยู่บนคลาวด์ (Supabase) ล้าง cache ก็ไม่หาย
- ต้อง login ก่อนถึงจะเห็นข้อมูล แต่ละบัญชีเห็นข้อมูลตัวเอง
- ยังมีปุ่ม **สำรองข้อมูล (Export/Import JSON)** ไว้เป็น backup เพิ่ม

## 🛠️ โหมดทดสอบในเครื่อง
ถ้ายังไม่ใส่คีย์ Supabase เปิด `index.html` ได้เลย แอปจะรันแบบ **ออฟไลน์** (เก็บใน localStorage)
มีแถบเหลืองเตือนด้านล่าง — เหมาะกับลองเล่นก่อนตั้งค่าจริง

## ⚠️ ข้อควรรู้
- อัปเดตคีย์/โค้ดแล้ว push ขึ้น GitHub → Vercel จะ deploy ใหม่ให้อัตโนมัติ
- อย่าแก้ชื่อตาราง `app_state` ใน SQL โดยไม่แก้ `CLOUD_TABLE` ใน `index.html` ให้ตรงกัน
