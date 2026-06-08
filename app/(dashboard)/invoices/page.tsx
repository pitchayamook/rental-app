import { getRoomsOverview } from "@/lib/queries/rooms";
import { currentPeriod, thMonthLabel } from "@/lib/domain/thai-date";
import { formatBaht } from "@/lib/domain/money";

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "ชำระแล้ว", cls: "text-green-600" },
  partial: { label: "บางส่วน", cls: "text-blue-600" },
  overdue: { label: "เกินกำหนด", cls: "text-red-600" },
  unpaid: { label: "ค้างชำระ", cls: "text-amber-600" },
  none: { label: "—", cls: "text-neutral-400" },
};

export default async function InvoicesPage() {
  const period = currentPeriod();
  const rooms = (await getRoomsOverview(period)).filter(
    (r) => r.room.status === "occupied",
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ออกใบแจ้งค่าเช่า</h1>
          <p className="text-sm text-neutral-500">{thMonthLabel(period)} · พิมพ์ A5</p>
        </div>
        <a
          href={`/invoices/print?month=${period}&rooms=all`}
          target="_blank"
          rel="noopener"
          className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          🖨 พิมพ์ทั้งหมด ({rooms.length})
        </a>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => {
          const st = STATUS[r.status];
          const rem = Math.max(0, r.billed - r.paid);
          return (
            <div key={r.room.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="font-bold">ห้อง {r.room.label}</div>
                <div className={`text-xs font-medium ${st.cls}`}>{st.label}</div>
              </div>
              <div className="mt-0.5 truncate text-xs text-neutral-500">
                {r.tenantName ?? "—"}
              </div>
              <div className="mt-2 text-sm">
                รวม <span className="font-bold text-red-600">{formatBaht(r.billed)}</span>
                {rem > 0 && rem < r.billed && (
                  <span className="ml-2 text-xs text-blue-600">คงค้าง {formatBaht(rem)}</span>
                )}
              </div>
              <a
                href={`/invoices/print?month=${period}&rooms=${encodeURIComponent(r.room.id)}`}
                target="_blank"
                rel="noopener"
                className="mt-3 block rounded-xl bg-blue-600 py-2 text-center text-sm font-semibold text-white"
              >
                🖨 พิมพ์ใบแจ้ง
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
