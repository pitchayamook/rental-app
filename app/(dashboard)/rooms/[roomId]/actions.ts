"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function helpers(formData: FormData) {
  const str = (k: string) => {
    const v = formData.get(k);
    const s = (v == null ? "" : String(v)).trim();
    return s === "" ? null : s;
  };
  const num = (k: string, d: number) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) ? v : d;
  };
  const date = (k: string) => str(k); // เก็บเป็น YYYY-MM-DD (Postgres cast ได้)
  return { str, num, date };
}

const ts = () => new Date().toISOString();

export async function saveRoom(roomId: string, formData: FormData) {
  const supabase = await createClient();
  const { str, num, date } = helpers(formData);

  const { data: room } = await supabase
    .from("rooms")
    .select("id, property_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return;

  const name = str("tenant_name");
  const status = str("status") ?? "vacant";
  const price = num("price", 0);

  await supabase
    .from("rooms")
    .update({ status, price, note: str("note"), updated_at: ts() })
    .eq("id", roomId);

  const { data: lease } = await supabase
    .from("leases")
    .select("id, tenant_id")
    .eq("room_id", roomId)
    .eq("is_active", true)
    .maybeSingle();

  const leaseFields = {
    start_date: date("start_date"),
    end_date: date("end_date"),
    monthly_price: price,
    deposit: num("deposit", 0),
    deposit_date: date("deposit_date"),
    deposit_status: str("deposit_status") ?? "holding",
    updated_at: ts(),
  };

  if (lease) {
    await supabase
      .from("tenants")
      .update({ full_name: name ?? "", phone: str("phone"), id_card: str("id_card"), updated_at: ts() })
      .eq("id", lease.tenant_id);
    await supabase.from("leases").update(leaseFields).eq("id", lease.id);
  } else if (name) {
    // ผู้เช่าใหม่ (ย้ายเข้า) → สร้าง tenant + lease + ตั้งห้องเป็นมีผู้เช่า
    const { data: t } = await supabase
      .from("tenants")
      .insert({ property_id: room.property_id, full_name: name, phone: str("phone"), id_card: str("id_card") })
      .select("id")
      .single();
    if (t) {
      await supabase.from("leases").insert({
        property_id: room.property_id,
        room_id: roomId,
        tenant_id: t.id,
        is_active: true,
        ...leaseFields,
      });
      await supabase.from("rooms").update({ status: "occupied" }).eq("id", roomId);
    }
  }

  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/rooms");
  revalidatePath("/");
  revalidatePath("/summary");
  redirect(`/rooms/${roomId}?saved=room`);
}

export async function recordPayment(roomId: string, period: string, formData: FormData) {
  const supabase = await createClient();
  const { str, num, date } = helpers(formData);

  const { data: room } = await supabase
    .from("rooms")
    .select("id, property_id")
    .eq("id", roomId)
    .maybeSingle();
  if (!room) return;

  const { data: lease } = await supabase
    .from("leases")
    .select("id")
    .eq("room_id", roomId)
    .eq("is_active", true)
    .maybeSingle();

  const amount = Math.max(0, num("paid_amount", 0));
  const paidAt = date("paid_at");
  const method = str("method");
  const note = str("note");
  const periodDate = `${period}-01`;

  if (amount <= 0 && !paidAt && !method && !note) {
    await supabase.from("payments").delete().eq("room_id", roomId).eq("period", periodDate);
  } else {
    await supabase.from("payments").upsert(
      {
        room_id: roomId,
        lease_id: lease?.id ?? null,
        property_id: room.property_id,
        period: periodDate,
        paid_amount: amount,
        paid_at: paidAt ? new Date(paidAt).toISOString() : null,
        method: method && ["cash", "transfer", "promptpay", "other"].includes(method) ? method : null,
        note,
        updated_at: ts(),
      },
      { onConflict: "room_id,period" },
    );
  }

  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/rooms");
  revalidatePath("/");
  revalidatePath("/summary");
  redirect(`/rooms/${roomId}?saved=payment`);
}
