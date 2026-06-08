import { createClient } from "@/lib/supabase/server";

export interface MeterRoom {
  roomId: string;
  label: string;
  tenantName: string | null;
  price: number;
  waterPrev: number;
  waterCurr: number;
  elecPrev: number;
  elecCurr: number;
  saved: boolean;
  prefilled: boolean;
}

export interface MetersData {
  rooms: MeterRoom[];
  rates: { waterRate: number; elecRate: number };
  prevLabel: string;
  anyPrefilled: boolean;
}

function prevPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m-1 = เดือนนี้ (0-index), -1 = เดือนก่อน
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const TH_SHORT = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
function thLabel(period: string) {
  const [y, m] = period.split("-");
  return `${TH_SHORT[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

export async function getMetersData(period: string): Promise<MetersData> {
  const supabase = await createClient();
  const periodDate = `${period}-01`;
  const prev = prevPeriod(period);
  const prevDate = `${prev}-01`;

  const [settingsRes, roomsRes, leasesRes, curRes, prevRes] = await Promise.all([
    supabase.from("property_settings").select("water_rate, elec_rate").limit(1).maybeSingle(),
    supabase.from("rooms").select("id, label, price").eq("status", "occupied").order("code"),
    supabase.from("leases").select("room_id, tenant:tenants(full_name)").eq("is_active", true),
    supabase.from("meter_readings").select("*").eq("period", periodDate),
    supabase.from("meter_readings").select("*").eq("period", prevDate),
  ]);

  const rates = {
    waterRate: Number(settingsRes.data?.water_rate ?? 25),
    elecRate: Number(settingsRes.data?.elec_rate ?? 7),
  };

  const tenantByRoom = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (leasesRes.data ?? []) as any[]) {
    const t = Array.isArray(l.tenant) ? l.tenant[0] : l.tenant;
    if (t?.full_name) tenantByRoom.set(l.room_id, t.full_name);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cur = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (curRes.data ?? []) as any[]) cur.set(m.room_id, m);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevM = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (prevRes.data ?? []) as any[]) prevM.set(m.room_id, m);

  let anyPrefilled = false;
  const rooms: MeterRoom[] = (
    (roomsRes.data ?? []) as { id: string; label: string; price: number }[]
  ).map((r) => {
    const c = cur.get(r.id);
    const p = prevM.get(r.id);
    let waterPrev = 0, waterCurr = 0, elecPrev = 0, elecCurr = 0, saved = false, prefilled = false;
    if (c) {
      waterPrev = Number(c.water_prev); waterCurr = Number(c.water_curr);
      elecPrev = Number(c.elec_prev); elecCurr = Number(c.elec_curr); saved = !!c.saved;
    } else if (p?.saved) {
      // เติมเลขเก่าจากเลขใหม่ของเดือนก่อน
      waterPrev = Number(p.water_curr); waterCurr = Number(p.water_curr);
      elecPrev = Number(p.elec_curr); elecCurr = Number(p.elec_curr);
      prefilled = true; anyPrefilled = true;
    }
    return {
      roomId: r.id, label: r.label, tenantName: tenantByRoom.get(r.id) ?? null,
      price: Number(r.price), waterPrev, waterCurr, elecPrev, elecCurr, saved, prefilled,
    };
  });

  return { rooms, rates, prevLabel: thLabel(prev), anyPrefilled };
}
