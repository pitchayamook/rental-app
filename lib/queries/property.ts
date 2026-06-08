import { createClient } from "@/lib/supabase/server";
import type { Property, PropertySettings } from "@/lib/types/db";

// หอพัก + ตั้งค่า (มีหอเดียวต่อเจ้าของในเฟสนี้)
export async function getPropertyWithSettings() {
  const supabase = await createClient();
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  const { data: settings } = await supabase
    .from("property_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  return {
    property: property as Property | null,
    settings: settings as PropertySettings | null,
  };
}
