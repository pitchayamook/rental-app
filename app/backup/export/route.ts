import { createClient } from "@/lib/supabase/server";

// ดาวน์โหลดข้อมูลทั้งหมดของเจ้าของเป็นไฟล์ JSON (RLS จำกัดเฉพาะข้อมูลตัวเอง)
export async function GET() {
  const supabase = await createClient();
  const { data: prop } = await supabase
    .from("properties")
    .select("*")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!prop) return Response.json({ error: "no property" }, { status: 404 });

  const pid = prop.id;
  const [settings, rooms, tenants, leases, meters, payments, expenses, items] =
    await Promise.all([
      supabase.from("property_settings").select("*").eq("property_id", pid),
      supabase.from("rooms").select("*").eq("property_id", pid),
      supabase.from("tenants").select("*").eq("property_id", pid),
      supabase.from("leases").select("*").eq("property_id", pid),
      supabase.from("meter_readings").select("*").eq("property_id", pid),
      supabase.from("payments").select("*").eq("property_id", pid),
      supabase.from("expenses").select("*").eq("property_id", pid),
      supabase.from("expense_items").select("*"),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    schema: "myroom-v3",
    property: prop,
    property_settings: settings.data ?? [],
    rooms: rooms.data ?? [],
    tenants: tenants.data ?? [],
    leases: leases.data ?? [],
    meter_readings: meters.data ?? [],
    payments: payments.data ?? [],
    expenses: expenses.data ?? [],
    expense_items: items.data ?? [],
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="myroom-backup-${date}.json"`,
    },
  });
}
