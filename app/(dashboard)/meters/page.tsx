import { getMetersData } from "@/lib/queries/meters";
import { currentPeriod, thMonthLabel } from "@/lib/domain/thai-date";
import { MetersTable } from "./meters-table";

export default async function MetersPage() {
  const period = currentPeriod();
  const data = await getMetersData(period);

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">บันทึกมิเตอร์น้ำ-ไฟ</h1>
      <p className="text-sm text-neutral-500">
        {thMonthLabel(period)} · {data.rooms.length} ห้อง · น้ำ {data.rates.waterRate} ·
        ไฟ {data.rates.elecRate} บ/หน่วย
      </p>

      {data.anyPrefilled && (
        <p className="mt-4 rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          💡 เลขเก่าถูกเติมอัตโนมัติจากเดือน {data.prevLabel} — กรอกเฉพาะ “เลขใหม่”
        </p>
      )}

      {data.rooms.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-500">ยังไม่มีห้องที่มีผู้เช่า</p>
      ) : (
        <div className="mt-4">
          <MetersTable initialRooms={data.rooms} rates={data.rates} period={period} />
        </div>
      )}
    </div>
  );
}
