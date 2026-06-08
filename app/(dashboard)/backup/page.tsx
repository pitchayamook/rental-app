import Link from "next/link";

export default function BackupPage() {
  return (
    <div>
      <Link href="/settings" className="text-sm text-blue-600">
        ← ตั้งค่า
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">สำรองข้อมูล</h1>
      <p className="text-sm text-neutral-500">ส่งออกข้อมูลทั้งหมดเป็นไฟล์ JSON</p>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-700">📥 ส่งออกข้อมูล</h2>
        <p className="mt-1 text-sm text-neutral-500">
          ดาวน์โหลดห้อง · ผู้เช่า · สัญญา · มิเตอร์ · การชำระ · รายจ่าย · ตั้งค่า
          ทั้งหมดเป็นไฟล์เดียว เก็บไว้เป็น backup
        </p>
        <a
          href="/backup/export"
          download
          className="mt-4 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
        >
          ⬇ ดาวน์โหลด JSON
        </a>
      </section>

      <p className="mt-3 text-xs text-neutral-400">
        การนำเข้า/กู้คืน — กำลังพัฒนา
      </p>
    </div>
  );
}
