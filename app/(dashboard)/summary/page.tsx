import { getRoomsOverview } from "@/lib/queries/rooms";
import { getMonthExpenses } from "@/lib/queries/expenses";
import { currentPeriod, thMonthLabel } from "@/lib/domain/thai-date";
import { formatBaht } from "@/lib/domain/money";

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "ชำระแล้ว", cls: "text-green-600" },
  partial: { label: "บางส่วน", cls: "text-blue-600" },
  overdue: { label: "เกินกำหนด", cls: "text-red-600" },
  unpaid: { label: "ค้างชำระ", cls: "text-amber-600" },
  none: { label: "—", cls: "text-neutral-400" },
};

export default async function SummaryPage() {
  const period = currentPeriod();
  const [rooms, expenses] = await Promise.all([
    getRoomsOverview(period),
    getMonthExpenses(period),
  ]);

  const occ = rooms.filter((r) => r.room.status === "occupied");
  const billed = rooms.reduce((s, r) => s + r.billed, 0);
  const received = rooms.reduce((s, r) => s + Math.min(r.paid, r.billed), 0);
  const outstanding = Math.max(0, billed - received);
  const profit = received - expenses.total;
  const count = (st: string) => occ.filter((r) => r.status === st).length;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">สรุปรายรับ-รายจ่าย</h1>
      <p className="text-sm text-neutral-500">{thMonthLabel(period)}</p>

      <div
        className={`mt-5 rounded-2xl p-5 ${profit >= 0 ? "bg-green-50" : "bg-red-50"}`}
      >
        <div className={`text-xs font-semibold ${profit >= 0 ? "text-green-700" : "text-red-700"}`}>
          กำไรสุทธิ (เงินสด) {thMonthLabel(period)}
        </div>
        <div className={`text-3xl font-bold tracking-tight ${profit >= 0 ? "text-green-700" : "text-red-700"}`}>
          {formatBaht(profit)}
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          รับชำระจริง {formatBaht(received)} − รายจ่าย {formatBaht(expenses.total)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat num={String(count("paid"))} label="ชำระแล้ว" cls="text-green-600" />
        <Stat num={String(count("partial"))} label="ชำระบางส่วน" cls="text-blue-600" />
        <Stat num={String(count("unpaid"))} label="ค้างชำระ" cls="text-amber-600" />
        <Stat num={String(count("overdue"))} label="เกินกำหนด" cls="text-red-600" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-green-600">📥 รายรับ</h2>
          <Row k={`ค่าเช่า + น้ำ + ไฟ (${occ.length} ห้อง)`} v={formatBaht(billed)} />
          <Row k="รับชำระแล้ว" v={formatBaht(received)} vCls="text-green-600" bold />
          <Row k="ค้างชำระ" v={formatBaht(outstanding)} vCls={outstanding > 0 ? "text-red-600" : "text-green-600"} bold />
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-red-600">📤 รายจ่าย</h2>
          <Row k="💧 ค่าน้ำ (การประปา)" v={formatBaht(expenses.water)} />
          <Row k="⚡ ค่าไฟ (การไฟฟ้า)" v={formatBaht(expenses.elec)} />
          <Row k="🚗 ค่าผ่อนรถ" v={formatBaht(expenses.carLoan)} />
          {expenses.items.map((it, i) => (
            <Row key={i} k={it.label || "รายการอื่นๆ"} v={formatBaht(it.amount)} />
          ))}
          <Row k="รวมรายจ่าย" v={formatBaht(expenses.total)} vCls="text-red-600" bold />
        </section>
      </div>

      <section className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <h2 className="border-b border-neutral-100 p-5 text-sm font-semibold text-neutral-700">
          รายละเอียดแต่ละห้อง
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="px-5 py-2 font-medium">ห้อง</th>
                <th className="px-3 py-2 font-medium">ผู้เช่า</th>
                <th className="px-3 py-2 text-right font-medium">เรียกเก็บ</th>
                <th className="px-3 py-2 text-right font-medium">รับชำระ</th>
                <th className="px-5 py-2 text-right font-medium">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {occ.map((r) => (
                <tr key={r.room.id} className="border-t border-neutral-50">
                  <td className="px-5 py-2 font-semibold">{r.room.label}</td>
                  <td className="px-3 py-2 text-neutral-500">{r.tenantName ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{formatBaht(r.billed)}</td>
                  <td className="px-3 py-2 text-right text-green-600">
                    {formatBaht(Math.min(r.paid, r.billed))}
                  </td>
                  <td className={`px-5 py-2 text-right font-medium ${STATUS[r.status].cls}`}>
                    {STATUS[r.status].label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ num, label, cls = "" }: { num: string; label: string; cls?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className={`text-xl font-bold tracking-tight ${cls}`}>{num}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{label}</div>
    </div>
  );
}

function Row({
  k,
  v,
  vCls = "",
  bold = false,
}: {
  k: string;
  v: string;
  vCls?: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1.5 text-sm ${bold ? "border-t border-neutral-100 mt-1 pt-2 font-semibold" : ""}`}
    >
      <span className="text-neutral-600">{k}</span>
      <span className={vCls}>{v}</span>
    </div>
  );
}
