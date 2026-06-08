// สมองการเงิน — พอร์ตจากแอปเดิม (index.html) แบบ 1:1
// ความต่าง: rate/dueDay/today รับเป็นพารามิเตอร์ (เดิมอ่านจาก global/state)

export type PaymentStatus = "paid" | "partial" | "overdue" | "unpaid" | "none";
export type PaymentMethod = "cash" | "transfer" | "promptpay" | "other";

export interface Rates {
  waterRate: number;
  elecRate: number;
}

export interface MeterReading {
  waterPrev: number;
  waterCurr: number;
  elecPrev: number;
  elecCurr: number;
}

export interface MeterCost {
  waterUsed: number;
  elecUsed: number;
  waterCost: number;
  elecCost: number;
}

// ค่าน้ำ/ค่าไฟ = (เลขใหม่ − เลขเก่า) × เรต (ไม่ติดลบ)
export function calcMeterCost(m: MeterReading, rates: Rates): MeterCost {
  const waterUsed = Math.max(0, (m.waterCurr || 0) - (m.waterPrev || 0));
  const elecUsed = Math.max(0, (m.elecCurr || 0) - (m.elecPrev || 0));
  return {
    waterUsed,
    elecUsed,
    waterCost: waterUsed * rates.waterRate,
    elecCost: elecUsed * rates.elecRate,
  };
}

// ยอดเรียกเก็บ = ค่าเช่า + ค่าน้ำ + ค่าไฟ
export function roomBillTotal(price: number, m: MeterReading, rates: Rates): number {
  const c = calcMeterCost(m, rates);
  return (price || 0) + c.waterCost + c.elecCost;
}

// วันครบกำหนดของรอบบิล "YYYY-MM" = วันที่ dueDay ของ "เดือนถัดไป"
export function dueDateForPeriod(period: string, dueDay: number): Date {
  const [y, m] = period.split("-").map(Number);
  const day = Math.min(28, Math.max(1, dueDay || 5));
  return new Date(y, m, day); // m เป็น 1-indexed ใน "YYYY-MM" → เดือนถัดไป (Date 0-indexed)
}

// สถานะการชำระ: paid → partial/overdue/unpaid → none (อิงยอด + วันครบกำหนด)
export function paymentStatus(args: {
  billed: number;
  paidAmount: number;
  due: Date;
  today?: Date;
}): PaymentStatus {
  const { billed, paidAmount } = args;
  if (billed <= 0) return "none";
  if (paidAmount >= billed) return "paid";
  const today = new Date(args.today ?? new Date());
  today.setHours(0, 0, 0, 0);
  const due = new Date(args.due);
  due.setHours(23, 59, 59, 999);
  if (today > due) return "overdue";
  if (paidAmount > 0) return "partial";
  return "unpaid";
}
