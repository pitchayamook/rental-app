import { createClient } from "@/lib/supabase/server";

export interface MonthExpenses {
  water: number;
  elec: number;
  carLoan: number;
  items: { label: string; amount: number }[];
  total: number;
}

// ค่าใช้จ่ายส่วนกลางของเดือน + รายการย่อย
export async function getMonthExpenses(period: string): Promise<MonthExpenses> {
  const supabase = await createClient();
  const periodDate = `${period}-01`;
  const { data: exp } = await supabase
    .from("expenses")
    .select("*, expense_items(label, amount, sort_order)")
    .eq("period", periodDate)
    .maybeSingle();

  const water = Number(exp?.water ?? 0);
  const elec = Number(exp?.elec ?? 0);
  const carLoan = Number(exp?.car_loan ?? 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawItems = (exp?.expense_items ?? []) as any[];
  const items = rawItems
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((i) => ({ label: String(i.label ?? ""), amount: Number(i.amount ?? 0) }));
  const total = water + elec + carLoan + items.reduce((s, i) => s + i.amount, 0);
  return { water, elec, carLoan, items, total };
}
