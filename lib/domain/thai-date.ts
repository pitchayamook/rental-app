// วันที่แบบไทย (พ.ศ.) — พอร์ตจากแอปเดิม

export const TH_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

export const TH_MONTHS_LONG = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// "YYYY-MM" → "มิ.ย. 2569"
export function thMonthLabel(period: string): string {
  const [y, m] = period.split("-");
  return `${TH_MONTHS_SHORT[parseInt(m) - 1]} ${parseInt(y) + 543}`;
}

// Date → "8 มิถุนายน 2569"
export function thLongDate(date: Date): string {
  return `${date.getDate()} ${TH_MONTHS_LONG[date.getMonth()]} ${date.getFullYear() + 543}`;
}

// คีย์เดือนปัจจุบัน "YYYY-MM"
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
