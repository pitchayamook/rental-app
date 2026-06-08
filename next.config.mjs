/** @type {import('next').NextConfig} */
const nextConfig = {
  // ปักรากโปรเจกต์ให้ตรง (กัน warning จาก lockfile ที่ /Users/sky)
  outputFileTracingRoot: import.meta.dirname,
  // ให้ middleware รันบน Node.js runtime ได้ (Supabase ใช้ process.* ที่ Edge ไม่รองรับ)
  experimental: { nodeMiddleware: true },
};

export default nextConfig;
