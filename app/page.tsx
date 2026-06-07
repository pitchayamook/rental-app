import { createClient } from "@/lib/supabase/server";

// หน้าแรก (เข้าได้เมื่อล็อกอินแล้ว — middleware กั้นไว้)
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold tracking-tight">MyRoom</h1>
      <p className="mt-1 text-sm text-neutral-500">
        ระบบจัดการหอพัก — เวอร์ชันใหม่ (Next.js) กำลังพัฒนา
      </p>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm">
          เข้าสู่ระบบในชื่อ:{" "}
          <strong>{user?.email ?? "ยังไม่ได้เข้าสู่ระบบ"}</strong>
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          เวอร์ชันเดิม (ใช้งานได้ปกติระหว่างย้าย):{" "}
          <a className="text-blue-600 underline" href="/legacy/index.html">
            เปิดแอปเดิม →
          </a>
        </p>
      </div>
    </main>
  );
}
