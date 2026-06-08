import { createClient } from "@/lib/supabase/server";
import {
  roomBillTotal,
  paymentStatus,
  dueDateForPeriod,
  type PaymentStatus,
} from "@/lib/domain/billing";
import type { Room } from "@/lib/types/db";

export interface RoomDetail {
  room: Room;
  tenant: { id: string; full_name: string; phone: string | null; id_card: string | null } | null;
  lease: {
    id: string;
    start_date: string | null;
    end_date: string | null;
    deposit: number;
    deposit_date: string | null;
    deposit_status: string;
  } | null;
  meter: { water_prev: number; water_curr: number; elec_prev: number; elec_curr: number } | null;
  payment: { paid_amount: number; paid_at: string | null; method: string | null; note: string | null } | null;
  billed: number;
  status: PaymentStatus;
}

export async function getRoomDetail(roomId: string, period: string): Promise<RoomDetail | null> {
  const supabase = await createClient();
  const periodDate = `${period}-01`;

  const { data: room } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (!room) return null;

  const [settingsRes, leaseRes, meterRes, payRes] = await Promise.all([
    supabase.from("property_settings").select("water_rate, elec_rate, due_day").limit(1).maybeSingle(),
    supabase
      .from("leases")
      .select("id, start_date, end_date, deposit, deposit_date, deposit_status, tenant:tenants(id, full_name, phone, id_card)")
      .eq("room_id", roomId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("meter_readings").select("*").eq("room_id", roomId).eq("period", periodDate).maybeSingle(),
    supabase.from("payments").select("*").eq("room_id", roomId).eq("period", periodDate).maybeSingle(),
  ]);

  const rates = {
    waterRate: Number(settingsRes.data?.water_rate ?? 25),
    elecRate: Number(settingsRes.data?.elec_rate ?? 7),
  };
  const dueDay = Number(settingsRes.data?.due_day ?? 5);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const l = leaseRes.data as any;
  const t = l ? (Array.isArray(l.tenant) ? l.tenant[0] : l.tenant) : null;
  const m = meterRes.data;
  const p = payRes.data;

  const reading = {
    waterPrev: Number(m?.water_prev ?? 0),
    waterCurr: Number(m?.water_curr ?? 0),
    elecPrev: Number(m?.elec_prev ?? 0),
    elecCurr: Number(m?.elec_curr ?? 0),
  };
  const occupied = room.status === "occupied";
  const billed = occupied ? roomBillTotal(Number(room.price), reading, rates) : 0;
  const paid = Number(p?.paid_amount ?? 0);
  const status = occupied
    ? paymentStatus({ billed, paidAmount: paid, due: dueDateForPeriod(period, dueDay) })
    : "none";

  return {
    room: room as Room,
    tenant: t ? { id: t.id, full_name: t.full_name, phone: t.phone ?? null, id_card: t.id_card ?? null } : null,
    lease: l
      ? {
          id: l.id,
          start_date: l.start_date,
          end_date: l.end_date,
          deposit: Number(l.deposit ?? 0),
          deposit_date: l.deposit_date,
          deposit_status: l.deposit_status ?? "holding",
        }
      : null,
    meter: m ? reading && { water_prev: reading.waterPrev, water_curr: reading.waterCurr, elec_prev: reading.elecPrev, elec_curr: reading.elecCurr } : null,
    payment: p
      ? { paid_amount: paid, paid_at: p.paid_at, method: p.method, note: p.note }
      : null,
    billed,
    status,
  };
}
