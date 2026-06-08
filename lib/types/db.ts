// ชนิดข้อมูลแถวจากตาราง Supabase (ตาม supabase/schema-v3.sql)
// เมื่อ schema ขึ้น Supabase แล้ว สร้างชนิดจริงด้วย `npm run db:types` ได้

export interface Property {
  id: string;
  owner_id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  tax_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface PropertySettings {
  property_id: string;
  due_day: number;
  water_rate: number;
  elec_rate: number;
  default_price: number;
  bank_name: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  promptpay: string | null;
  payment_note: string | null;
  updated_at: string;
}

export interface Room {
  id: string;
  property_id: string;
  code: string;
  label: string;
  is_suite: boolean;
  price: number;
  status: "occupied" | "vacant" | "maintenance";
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  property_id: string;
  full_name: string;
  phone: string | null;
  id_card: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lease {
  id: string;
  property_id: string;
  room_id: string;
  tenant_id: string;
  start_date: string | null;
  end_date: string | null;
  monthly_price: number | null;
  deposit: number;
  deposit_date: string | null;
  deposit_status: "holding" | "returned" | "deducted";
  is_active: boolean;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeterReadingRow {
  id: string;
  room_id: string;
  property_id: string;
  period: string; // YYYY-MM-01
  water_prev: number;
  water_curr: number;
  elec_prev: number;
  elec_curr: number;
  saved: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  room_id: string;
  lease_id: string | null;
  property_id: string;
  period: string;
  billed_rent: number | null;
  billed_water: number | null;
  billed_elec: number | null;
  paid_amount: number;
  paid_at: string | null;
  method: "cash" | "transfer" | "promptpay" | "other" | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseRow {
  id: string;
  property_id: string;
  period: string;
  water: number;
  elec: number;
  car_loan: number;
  created_at: string;
  updated_at: string;
}

export interface ExpenseItemRow {
  id: string;
  expense_id: string;
  label: string;
  amount: number;
  sort_order: number;
}
