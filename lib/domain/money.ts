// จัดรูปแบบเงิน — พอร์ตจากแอปเดิม (formatBaht / fmtMoney)

export function formatBaht(n: number | null | undefined): string {
  return "฿" + Number(n || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

export function fmtMoney(n: number | null | undefined): string {
  return Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
