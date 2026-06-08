import { createClient } from "@/lib/supabase/server";
import {
  roomBillTotal,
  paymentStatus,
  dueDateForPeriod,
  type PaymentStatus,
  type Rates,
} from "@/lib/domain/billing";
import type { Room } from "@/lib/types/db";

export interface RoomOverview {
  room: Room;
  tenantName: string | null;
  tenantPhone: string | null;
  billed: number;
  paid: number;
  status: PaymentStatus;
}

// ดึงห้องทั้งหมด + ผู้เช่าปัจจุบัน + มิเตอร์/การชำระของเดือนนั้น แล้วคำนวณสถานะ
export async function getRoomsOverview(period: string): Promise<RoomOverview[]> {
  const supabase = await createClient();
  const periodDate = `${period}-01`;

  const [settingsRes, roomsRes, leasesRes, metersRes, paymentsRes] =
    await Promise.all([
      supabase.from("property_settings").select("*").maybeSingle(),
      supabase.from("rooms").select("*").order("code"),
      supabase
        .from("leases")
        .select("room_id, tenant:tenants(full_name, phone)")
        .eq("is_active", true),
      supabase.from("meter_readings").select("*").eq("period", periodDate),
      supabase.from("payments").select("*").eq("period", periodDate),
    ]);

  const settings = settingsRes.data;
  const rates: Rates = {
    waterRate: Number(settings?.water_rate ?? 25),
    elecRate: Number(settings?.elec_rate ?? 7),
  };
  const dueDay = Number(settings?.due_day ?? 5);
  const due = dueDateForPeriod(period, dueDay);
  const today = new Date();

  const leaseByRoom = new Map<string, { full_name: string; phone: string | null }>();
  // Supabase เดา nested relation เป็น array — to-one จริง ๆ คืน object เดียว รองรับทั้งสองแบบ
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (leasesRes.data ?? []) as any[]) {
    const t = Array.isArray(l.tenant) ? l.tenant[0] : l.tenant;
    if (t) leaseByRoom.set(l.room_id, { full_name: t.full_name, phone: t.phone ?? null });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meterByRoom = new Map<string, any>();
  for (const m of (metersRes.data ?? []) as Array<{ room_id: string }>) {
    meterByRoom.set(m.room_id, m);
  }
  const paidByRoom = new Map<string, number>();
  for (const p of (paymentsRes.data ?? []) as Array<{
    room_id: string;
    paid_amount: number;
  }>) {
    paidByRoom.set(p.room_id, Number(p.paid_amount ?? 0));
  }

  return ((roomsRes.data ?? []) as Room[]).map((room) => {
    const m = meterByRoom.get(room.id);
    const reading = {
      waterPrev: Number(m?.water_prev ?? 0),
      waterCurr: Number(m?.water_curr ?? 0),
      elecPrev: Number(m?.elec_prev ?? 0),
      elecCurr: Number(m?.elec_curr ?? 0),
    };
    const occupied = room.status === "occupied";
    const billed = occupied ? roomBillTotal(Number(room.price), reading, rates) : 0;
    const paid = paidByRoom.get(room.id) ?? 0;
    const tenant = leaseByRoom.get(room.id);
    return {
      room,
      tenantName: tenant?.full_name ?? null,
      tenantPhone: tenant?.phone ?? null,
      billed,
      paid,
      status: occupied
        ? paymentStatus({ billed, paidAmount: paid, due, today })
        : "none",
    };
  });
}
