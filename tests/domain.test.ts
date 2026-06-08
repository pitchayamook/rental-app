// ทดสอบ logic การเงินที่พอร์ตมา — golden values + เทียบกับฟังก์ชันจริงในแอปเดิม
// รัน: node tests/domain.test.ts   (Node 24 รัน .ts ตรง ๆ ด้วย type stripping)
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  calcMeterCost,
  roomBillTotal,
  dueDateForPeriod,
  paymentStatus,
} from "../lib/domain/billing.ts";
import { thMonthLabel } from "../lib/domain/thai-date.ts";
import { formatBaht, fmtMoney } from "../lib/domain/money.ts";

let pass = 0;
let fail = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    pass++;
    console.log("✅ " + name);
  } catch (e) {
    fail++;
    console.log("❌ " + name + " — " + (e as Error).message);
  }
}

const rates = { waterRate: 25, elecRate: 7 };

// ── golden values (เข้ารหัสพฤติกรรมแอปเดิม) ──
check("calcMeterCost", () => {
  const c = calcMeterCost({ waterPrev: 10, waterCurr: 25, elecPrev: 100, elecCurr: 150 }, rates);
  assert.deepEqual(c, { waterUsed: 15, elecUsed: 50, waterCost: 375, elecCost: 350 });
});
check("calcMeterCost ไม่ติดลบ (curr<prev → 0)", () => {
  const c = calcMeterCost({ waterPrev: 30, waterCurr: 10, elecPrev: 0, elecCurr: 0 }, rates);
  assert.equal(c.waterUsed, 0);
  assert.equal(c.waterCost, 0);
});
check("roomBillTotal = ค่าเช่า + น้ำ + ไฟ", () => {
  assert.equal(
    roomBillTotal(2500, { waterPrev: 10, waterCurr: 25, elecPrev: 100, elecCurr: 150 }, rates),
    2500 + 375 + 350,
  );
});
check("dueDateForPeriod = dueDay ของเดือนถัดไป", () => {
  const d = dueDateForPeriod("2026-06", 5);
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 6); // กรกฎาคม (0-indexed)
  assert.equal(d.getDate(), 5);
});
check("dueDateForPeriod ธ.ค. → ม.ค. ปีถัดไป", () => {
  const d = dueDateForPeriod("2026-12", 5);
  assert.equal(d.getFullYear(), 2027);
  assert.equal(d.getMonth(), 0);
});
check("paymentStatus: จ่ายครบ → paid", () => {
  assert.equal(paymentStatus({ billed: 1000, paidAmount: 1000, due: new Date("2026-07-05") }), "paid");
});
check("paymentStatus: บิล 0 → none", () => {
  assert.equal(paymentStatus({ billed: 0, paidAmount: 0, due: new Date("2026-07-05") }), "none");
});
check("paymentStatus: บางส่วน ยังไม่เกินกำหนด → partial", () => {
  assert.equal(
    paymentStatus({ billed: 1000, paidAmount: 500, due: new Date("2999-01-01"), today: new Date("2026-06-10") }),
    "partial",
  );
});
check("paymentStatus: ยังไม่จ่าย ยังไม่เกินกำหนด → unpaid", () => {
  assert.equal(
    paymentStatus({ billed: 1000, paidAmount: 0, due: new Date("2999-01-01"), today: new Date("2026-06-10") }),
    "unpaid",
  );
});
check("paymentStatus: เลยกำหนด → overdue", () => {
  assert.equal(
    paymentStatus({ billed: 1000, paidAmount: 0, due: new Date("2026-06-05"), today: new Date("2026-07-10") }),
    "overdue",
  );
});
check("paymentStatus: จ่ายครบชนะ overdue", () => {
  assert.equal(
    paymentStatus({ billed: 1000, paidAmount: 1000, due: new Date("2026-06-05"), today: new Date("2026-07-10") }),
    "paid",
  );
});
check("thMonthLabel = เดือนย่อ + พ.ศ.", () => {
  assert.equal(thMonthLabel("2026-06"), "มิ.ย. 2569");
});
check("formatBaht", () => {
  assert.equal(formatBaht(2750), "฿2,750");
  assert.equal(formatBaht(0), "฿0");
  assert.equal(formatBaht(null), "฿0");
});
check("fmtMoney = ทศนิยม 2 ตำแหน่ง", () => {
  assert.equal(fmtMoney(375), "375.00");
});

// ── parity: ดึงฟังก์ชันจริงจากแอปเดิมมารัน เทียบผลลัพธ์ ──
const legacy = fs.readFileSync("public/legacy/index.html", "utf8");
function extract(name: string): string {
  const start = legacy.indexOf("function " + name);
  let i = legacy.indexOf("{", start);
  let depth = 0;
  let end = -1;
  for (; i < legacy.length; i++) {
    if (legacy[i] === "{") depth++;
    else if (legacy[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  return legacy.slice(start, end);
}
const WATER_RATE = 25;
const ELEC_RATE = 7;
const legacyCalc = eval("(" + extract("calcMeterCost") + ")");
const legacyMonth = eval("(" + extract("thMonthLabel") + ")");
const legacyBaht = eval("(" + extract("formatBaht") + ")");

check("parity: calcMeterCost ตรงกับ legacy (50 เคส)", () => {
  for (let k = 0; k < 50; k++) {
    const wp = k * 3;
    const wc = wp + (k % 7);
    const ep = k * 11;
    const ec = ep + (k % 13);
    const mine = calcMeterCost({ waterPrev: wp, waterCurr: wc, elecPrev: ep, elecCurr: ec }, rates);
    const old = legacyCalc({ wPrev: wp, wCurr: wc, ePrev: ep, eCurr: ec });
    assert.equal(mine.waterCost, old.wCost);
    assert.equal(mine.elecCost, old.eCost);
  }
});
check("parity: thMonthLabel ตรงกับ legacy (12 เดือน)", () => {
  for (let m = 1; m <= 12; m++) {
    const p = "2026-" + String(m).padStart(2, "0");
    assert.equal(thMonthLabel(p), legacyMonth(p));
  }
});
check("parity: formatBaht ตรงกับ legacy", () => {
  for (const n of [0, 5, 2750, 12345, 1000000]) {
    assert.equal(formatBaht(n), legacyBaht(n));
  }
});

console.log(`\n${fail === 0 ? "🎉 ผ่านทั้งหมด" : "⚠️ มีเคสล้มเหลว"} — ผ่าน ${pass} / ล้มเหลว ${fail}`);
process.exit(fail === 0 ? 0 : 1);
