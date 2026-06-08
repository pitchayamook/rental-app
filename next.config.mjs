/** @type {import('next').NextConfig} */
const nextConfig = {
  // ปักรากโปรเจกต์ให้ตรง (กัน warning จาก lockfile ที่ /Users/sky)
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
