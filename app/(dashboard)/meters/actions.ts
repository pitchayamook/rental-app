"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface MeterSaveRow {
  roomId: string;
  waterPrev: number;
  waterCurr: number;
  elecPrev: number;
  elecCurr: number;
}

export async function saveMeters(period: string, rows: MeterSaveRow[]) {
  const supabase = await createClient();
  const { data: prop } = await supabase
    .from("properties")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!prop) return { ok: false, count: 0 };

  // เฉพาะห้องของหอเรา (กันเขียนข้ามหอ)
  const { data: rooms } = await supabase
    .from("rooms")
    .select("id")
    .eq("property_id", prop.id);
  const valid = new Set((rooms ?? []).map((r: { id: string }) => r.id));

  const periodDate = `${period}-01`;
  const payload = rows
    .filter((r) => valid.has(r.roomId))
    .map((r) => ({
      room_id: r.roomId,
      property_id: prop.id,
      period: periodDate,
      water_prev: Number(r.waterPrev) || 0,
      water_curr: Number(r.waterCurr) || 0,
      elec_prev: Number(r.elecPrev) || 0,
      elec_curr: Number(r.elecCurr) || 0,
      saved: true,
      updated_at: new Date().toISOString(),
    }));

  if (payload.length) {
    const { error } = await supabase
      .from("meter_readings")
      .upsert(payload, { onConflict: "room_id,period" });
    if (error) return { ok: false, count: 0 };
  }

  revalidatePath("/meters");
  revalidatePath("/");
  revalidatePath("/rooms");
  revalidatePath("/summary");
  return { ok: true, count: payload.length };
}
