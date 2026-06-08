import { createClient } from "@/lib/supabase/server";
import {
  calcMeterCost,
  dueDateForPeriod,
  paymentStatus,
  type PaymentStatus,
} from "@/lib/domain/billing";

export interface InvoiceItem {
  roomLabel: string;
  isSuite: boolean;
  tenantName: string | null;
  tenantPhone: string | null;
  rent: number;
  waterPrev: number;
  waterCurr: number;
  waterUsed: number;
  waterCost: number;
  elecPrev: number;
  elecCurr: number;
  elecUsed: number;
  elecCost: number;
  total: number;
  paid: number;
  remaining: number;
  status: PaymentStatus;
  paidAt: string | null;
  method: string | null;
}

export interface InvoiceData {
  brand: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  taxId: string | null;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
  promptpay: string | null;
  paymentNote: string | null;
  waterRate: number;
  elecRate: number;
  dueDay: number;
  items: InvoiceItem[];
}

export async function getInvoices(period: string, roomIds?: string[]): Promise<InvoiceData> {
  const supabase = await createClient();
  const periodDate = `${period}-01`;

  const [propRes, setRes, roomsRes, leasesRes, metersRes, paymentsRes] = await Promise.all([
    supabase.from("properties").select("*").order("created_at").limit(1).maybeSingle(),
    supabase.from("property_settings").select("*").limit(1).maybeSingle(),
    supabase.from("rooms").select("*").eq("status", "occupied").order("code"),
    supabase.from("leases").select("room_id, tenant:tenants(full_name, phone)").eq("is_active", true),
    supabase.from("meter_readings").select("*").eq("period", periodDate),
    supabase.from("payments").select("*").eq("period", periodDate),
  ]);

  const set = setRes.data;
  const rates = { waterRate: Number(set?.water_rate ?? 25), elecRate: Number(set?.elec_rate ?? 7) };
  const dueDay = Number(set?.due_day ?? 5);
  const due = dueDateForPeriod(period, dueDay);

  const tenantByRoom = new Map<string, { full_name: string; phone: string | null }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const l of (leasesRes.data ?? []) as any[]) {
    const t = Array.isArray(l.tenant) ? l.tenant[0] : l.tenant;
    if (t) tenantByRoom.set(l.room_id, { full_name: t.full_name, phone: t.phone ?? null });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meterByRoom = new Map<string, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (metersRes.data ?? []) as any[]) meterByRoom.set(m.room_id, m);
  const payByRoom = new Map<string, { paid_amount: number; paid_at: string | null; method: string | null }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (paymentsRes.data ?? []) as any[]) {
    payByRoom.set(p.room_id, { paid_amount: Number(p.paid_amount ?? 0), paid_at: p.paid_at, method: p.method });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rooms = (roomsRes.data ?? []) as any[];
  if (roomIds && roomIds.length) rooms = rooms.filter((r) => roomIds.includes(r.id));

  const items: InvoiceItem[] = rooms.map((room) => {
    const m = meterByRoom.get(room.id);
    const reading = {
      waterPrev: Number(m?.water_prev ?? 0),
      waterCurr: Number(m?.water_curr ?? 0),
      elecPrev: Number(m?.elec_prev ?? 0),
      elecCurr: Number(m?.elec_curr ?? 0),
    };
    const c = calcMeterCost(reading, rates);
    const rent = Number(room.price);
    const total = rent + c.waterCost + c.elecCost;
    const pay = payByRoom.get(room.id);
    const paid = pay?.paid_amount ?? 0;
    const tenant = tenantByRoom.get(room.id);
    return {
      roomLabel: room.label,
      isSuite: !!room.is_suite,
      tenantName: tenant?.full_name ?? null,
      tenantPhone: tenant?.phone ?? null,
      rent,
      waterPrev: reading.waterPrev,
      waterCurr: reading.waterCurr,
      waterUsed: c.waterUsed,
      waterCost: c.waterCost,
      elecPrev: reading.elecPrev,
      elecCurr: reading.elecCurr,
      elecUsed: c.elecUsed,
      elecCost: c.elecCost,
      total,
      paid,
      remaining: Math.max(0, total - paid),
      status: paymentStatus({ billed: total, paidAmount: paid, due }),
      paidAt: pay?.paid_at ?? null,
      method: pay?.method ?? null,
    };
  });

  return {
    brand: propRes.data?.name ?? "MyRoom",
    tagline: propRes.data?.tagline ?? null,
    address: propRes.data?.address ?? null,
    phone: propRes.data?.phone ?? null,
    taxId: propRes.data?.tax_id ?? null,
    bankName: set?.bank_name ?? null,
    bankAccount: set?.bank_account ?? null,
    bankHolder: set?.bank_holder ?? null,
    promptpay: set?.promptpay ?? null,
    paymentNote: set?.payment_note ?? null,
    waterRate: rates.waterRate,
    elecRate: rates.elecRate,
    dueDay,
    items,
  };
}
