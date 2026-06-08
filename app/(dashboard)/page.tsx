import Link from "next/link";
import { getRoomsOverview } from "@/lib/queries/rooms";
import { currentPeriod, thMonthLabel } from "@/lib/domain/thai-date";
import { formatBaht } from "@/lib/domain/money";

export default async function DashboardPage() {
  const period = currentPeriod();
  const rooms = await getRoomsOverview(period);
  const occ = rooms.filter((r) => r.room.status === "occupied").length;
  const billed = rooms.reduce((s, r) => s + r.billed, 0);
  const received = rooms.reduce((s, r) => s + Math.min(r.paid, r.billed), 0);
  const outstanding = Math.max(0, billed - received);
  const toCollect = rooms
    .filter(
      (r) =>
        r.status === "overdue" || r.status === "unpaid" || r.status === "partial",
    )
    .sort((a, b) => b.billed - b.paid - (a.billed - a.paid));

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">ภาพรวม</h1>
      <p className="text-sm text-neutral-500">{thMonthLabel(period)}</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat num={`${occ}/${rooms.length}`} label="ห้องมีผู้เช่า" />
        <Stat num={formatBaht(received)} label="รับชำระแล้ว" cls="text-green-600" />
        <Stat
          num={formatBaht(outstanding)}
          label="ค้างชำระ"
          cls={outstanding > 0 ? "text-amber-600" : "text-green-600"}
        />
        <Stat num={formatBaht(billed)} label="เรียกเก็บรวม" />
      </div>

      <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">
            ห้องที่ต้องตามเก็บ
          </h2>
          <Link href="/rooms" className="text-xs font-medium text-blue-600">
            ดูห้องทั้งหมด →
          </Link>
        </div>
        {toCollect.length === 0 ? (
          <p className="py-6 text-center text-sm text-green-600">
            ✓ เก็บครบทุกห้องแล้ว
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {toCollect.map((r) => (
              <li
                key={r.room.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <span>
                  <span className="font-semibold">ห้อง {r.room.label}</span>{" "}
                  <span className="text-neutral-500">· {r.tenantName ?? "—"}</span>
                </span>
                <span className="font-semibold text-red-600">
                  {formatBaht(r.billed - r.paid)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  num,
  label,
  cls = "",
}: {
  num: string;
  label: string;
  cls?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className={`text-xl font-bold tracking-tight ${cls}`}>{num}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{label}</div>
    </div>
  );
}
