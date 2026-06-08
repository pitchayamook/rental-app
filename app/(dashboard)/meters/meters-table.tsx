"use client";

import { useState, useTransition } from "react";
import { calcMeterCost } from "@/lib/domain/billing";
import { formatBaht } from "@/lib/domain/money";
import { saveMeters } from "./actions";
import type { MeterRoom } from "@/lib/queries/meters";

interface RowState {
  roomId: string;
  label: string;
  tenantName: string | null;
  price: number;
  saved: boolean;
  waterPrev: string;
  waterCurr: string;
  elecPrev: string;
  elecCurr: string;
}

const n = (v: string) => Number(v) || 0;

export function MetersTable({
  initialRooms,
  rates,
  period,
}: {
  initialRooms: MeterRoom[];
  rates: { waterRate: number; elecRate: number };
  period: string;
}) {
  const [rows, setRows] = useState<RowState[]>(() =>
    initialRooms.map((r) => ({
      roomId: r.roomId,
      label: r.label,
      tenantName: r.tenantName,
      price: r.price,
      saved: r.saved,
      waterPrev: String(r.waterPrev),
      waterCurr: String(r.waterCurr),
      elecPrev: String(r.elecPrev),
      elecCurr: String(r.elecCurr),
    })),
  );
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function update(roomId: string, field: keyof RowState, value: string) {
    setRows((rs) =>
      rs.map((r) => (r.roomId === roomId ? { ...r, [field]: value } : r)),
    );
    setMsg(null);
  }

  function save() {
    startTransition(async () => {
      const res = await saveMeters(
        period,
        rows.map((r) => ({
          roomId: r.roomId,
          waterPrev: n(r.waterPrev),
          waterCurr: n(r.waterCurr),
          elecPrev: n(r.elecPrev),
          elecCurr: n(r.elecCurr),
        })),
      );
      setMsg(res.ok ? `✓ บันทึกแล้ว ${res.count} ห้อง` : "บันทึกไม่สำเร็จ ลองอีกครั้ง");
    });
  }

  let totW = 0, totE = 0, totRent = 0, totAll = 0;
  const computed = rows.map((r) => {
    const c = calcMeterCost(
      { waterPrev: n(r.waterPrev), waterCurr: n(r.waterCurr), elecPrev: n(r.elecPrev), elecCurr: n(r.elecCurr) },
      rates,
    );
    const total = r.price + c.waterCost + c.elecCost;
    totW += c.waterCost; totE += c.elecCost; totRent += r.price; totAll += total;
    return { r, c, total };
  });

  const inp =
    "w-20 rounded-lg bg-neutral-100 px-2 py-1 text-right text-sm outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500">
                <th className="px-4 py-2.5 font-medium">ห้อง</th>
                <th className="px-2 py-2.5 font-medium">น้ำ เก่า</th>
                <th className="px-2 py-2.5 font-medium">น้ำ ใหม่</th>
                <th className="px-2 py-2.5 text-right font-medium">ค่าน้ำ</th>
                <th className="px-2 py-2.5 font-medium">ไฟ เก่า</th>
                <th className="px-2 py-2.5 font-medium">ไฟ ใหม่</th>
                <th className="px-2 py-2.5 text-right font-medium">ค่าไฟ</th>
                <th className="px-2 py-2.5 text-right font-medium">ค่าเช่า</th>
                <th className="px-4 py-2.5 text-right font-medium">รวม</th>
              </tr>
            </thead>
            <tbody>
              {computed.map(({ r, c, total }) => (
                <tr key={r.roomId} className="border-t border-neutral-50">
                  <td className="px-4 py-2">
                    <div className="font-semibold">{r.label}</div>
                    <div className="max-w-[7rem] truncate text-xs text-neutral-400">
                      {r.tenantName ?? "—"}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <input className={inp} type="number" value={r.waterPrev}
                      onChange={(e) => update(r.roomId, "waterPrev", e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <input className={inp} type="number" value={r.waterCurr}
                      onChange={(e) => update(r.roomId, "waterCurr", e.target.value)} />
                  </td>
                  <td className="px-2 py-2 text-right text-blue-600">
                    {formatBaht(c.waterCost)}
                    <div className="text-xs text-neutral-400">{c.waterUsed} หน่วย</div>
                  </td>
                  <td className="px-2 py-2">
                    <input className={inp} type="number" value={r.elecPrev}
                      onChange={(e) => update(r.roomId, "elecPrev", e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <input className={inp} type="number" value={r.elecCurr}
                      onChange={(e) => update(r.roomId, "elecCurr", e.target.value)} />
                  </td>
                  <td className="px-2 py-2 text-right text-amber-600">
                    {formatBaht(c.elecCost)}
                    <div className="text-xs text-neutral-400">{c.elecUsed} หน่วย</div>
                  </td>
                  <td className="px-2 py-2 text-right">{formatBaht(r.price)}</td>
                  <td className="px-4 py-2 text-right font-bold text-red-600">{formatBaht(total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200 bg-neutral-50 font-semibold">
                <td className="px-4 py-2.5">รวม</td>
                <td colSpan={2} />
                <td className="px-2 py-2.5 text-right text-blue-600">{formatBaht(totW)}</td>
                <td colSpan={2} />
                <td className="px-2 py-2.5 text-right text-amber-600">{formatBaht(totE)}</td>
                <td className="px-2 py-2.5 text-right">{formatBaht(totRent)}</td>
                <td className="px-4 py-2.5 text-right text-red-600">{formatBaht(totAll)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        {msg && <span className="text-sm font-medium text-green-600">{msg}</span>}
        <button
          onClick={save}
          disabled={pending}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "กำลังบันทึก…" : "บันทึกมิเตอร์"}
        </button>
      </div>
    </div>
  );
}
