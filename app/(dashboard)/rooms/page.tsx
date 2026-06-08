import { getRoomsOverview } from "@/lib/queries/rooms";
import { currentPeriod } from "@/lib/domain/thai-date";
import { formatBaht } from "@/lib/domain/money";

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "ชำระแล้ว", cls: "bg-green-50 text-green-700" },
  partial: { label: "บางส่วน", cls: "bg-blue-50 text-blue-700" },
  overdue: { label: "เกินกำหนด", cls: "bg-red-50 text-red-700" },
  unpaid: { label: "ค้างชำระ", cls: "bg-amber-50 text-amber-700" },
  none: { label: "", cls: "" },
};
const TOPBAR: Record<string, string> = {
  occupied: "bg-amber-400",
  vacant: "bg-green-400",
  maintenance: "bg-red-400",
};

export default async function RoomsPage() {
  const rooms = await getRoomsOverview(currentPeriod());

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">ห้องพัก</h1>
      <p className="text-sm text-neutral-500">{rooms.length} ห้อง</p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {rooms.map((r) => {
          const st = STATUS[r.status];
          return (
            <div
              key={r.room.id}
              className={`relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ${
                r.status === "overdue" ? "ring-2 ring-red-400" : ""
              }`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 ${TOPBAR[r.room.status] ?? ""}`}
              />
              <div className="text-xl font-bold">
                {r.room.label}
                {r.room.is_suite && (
                  <span className="ml-1 align-middle rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                    SUITE
                  </span>
                )}
              </div>
              <div className="mt-1 truncate text-xs text-neutral-500">
                {r.tenantName ?? "— ว่าง —"}
              </div>
              <div className="mt-2 text-sm font-semibold">
                {formatBaht(Number(r.room.price))}
              </div>
              {st.label && (
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}
                >
                  {st.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
