"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: prop } = await supabase
    .from("properties")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!prop) return;

  const str = (k: string) => {
    const v = formData.get(k);
    const s = (v == null ? "" : String(v)).trim();
    return s === "" ? null : s;
  };
  const num = (k: string, d: number) => {
    const v = Number(formData.get(k));
    return Number.isFinite(v) ? v : d;
  };

  await supabase
    .from("properties")
    .update({
      name: str("name") ?? "MyRoom",
      tagline: str("tagline"),
      address: str("address"),
      phone: str("phone"),
      tax_id: str("tax_id"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", prop.id);

  await supabase.from("property_settings").upsert(
    {
      property_id: prop.id,
      due_day: Math.min(28, Math.max(1, Math.round(num("due_day", 5)))),
      water_rate: Math.max(0, num("water_rate", 25)),
      elec_rate: Math.max(0, num("elec_rate", 7)),
      default_price: Math.max(0, num("default_price", 2500)),
      bank_name: str("bank_name"),
      bank_account: str("bank_account"),
      bank_holder: str("bank_holder"),
      promptpay: str("promptpay"),
      payment_note: str("payment_note"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "property_id" },
  );

  revalidatePath("/settings");
  revalidatePath("/"); // เรตกระทบหน้าภาพรวม
  revalidatePath("/rooms");
  redirect("/settings?saved=1");
}
