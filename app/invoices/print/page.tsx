import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvoices } from "@/lib/queries/invoices";
import { currentPeriod, thMonthLabel, thLongDate, TH_MONTHS_SHORT } from "@/lib/domain/thai-date";
import { fmtMoney } from "@/lib/domain/money";
import { PrintTrigger } from "./print-trigger";

const METHOD_LABEL: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอนผ่านธนาคาร",
  promptpay: "พร้อมเพย์",
  other: "อื่นๆ",
};

function dueLabel(period: string, dueDay: number) {
  const [y, m] = period.split("-").map(Number);
  const day = Math.min(28, Math.max(1, dueDay || 5));
  const d = new Date(y, m, day); // m (1-index) → เดือนถัดไป
  return `${d.getDate()} ${TH_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function invoiceNo(period: string, label: string) {
  return `INV-${period.replace("-", "")}-${String(label).replace(/[^A-Za-z0-9-]/g, "")}`;
}

const CSS = `
  @page { size: A5 portrait; margin: 0; }
  html,body{font-family:var(--font-sarabun),sans-serif;color:#222;background:#e7e7e7;font-size:9pt;line-height:1.38;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .invoice{width:148mm;height:210mm;padding:12mm 12mm 9mm;page-break-after:always;position:relative;background:#fff;margin:8px auto;box-shadow:0 1px 8px rgba(0,0,0,.06);overflow:hidden}
  .invoice:last-child{page-break-after:auto}
  .mono{font-family:var(--font-mono),monospace;font-feature-settings:"tnum"}
  .lh{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #222;padding-bottom:8px;margin-bottom:11px;gap:10px}
  .lh-l{display:flex;align-items:center;gap:9px;flex:1;min-width:0}
  .lh-logo{width:30px;height:30px;flex-shrink:0;background:#1a1a1a;color:#fff;border-radius:3px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13pt}
  .lh-name{font-size:11pt;font-weight:700;line-height:1.12;color:#1a1a1a}
  .lh-tag{font-size:7pt;color:#8a8a8a;margin-top:1px}
  .lh-meta{font-size:7pt;color:#6d6d6d;margin-top:2px;line-height:1.4}
  .lh-r{text-align:right;flex-shrink:0}
  .lh-r .lbl{color:#9a9a9a;font-size:6.5pt;letter-spacing:0.08em;text-transform:uppercase;margin-top:3px;font-weight:600}
  .lh-r .val{font-weight:700;font-size:8.5pt;color:#1a1a1a}
  .lh-r .due{color:#333;text-decoration:underline;text-underline-offset:2px}
  .title{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;padding-left:9px;border-left:2px solid #1a1a1a}
  .title .t{font-size:10pt;font-weight:700;text-transform:uppercase;letter-spacing:0.01em}
  .title .t small{font-weight:400;color:#8a8a8a;font-size:7.5pt;margin-left:6px;text-transform:none}
  .title .period{font-size:8pt;color:#6d6d6d;font-weight:600}
  .info{display:grid;grid-template-columns:1.2fr 1fr;gap:8px;margin-bottom:10px}
  .info-box{background:#fff;border:1px solid #dcdcdc;border-radius:3px;padding:7px 10px}
  .info-box .h{font-size:6.5pt;color:#9a9a9a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;font-weight:700}
  .info-box .name{font-size:9.5pt;font-weight:700;color:#1a1a1a}
  .info-box .row{font-size:8pt;color:#555;margin-top:1px}
  table.items{width:100%;border-collapse:collapse;margin-bottom:9px;font-size:8.5pt;table-layout:fixed}
  table.items thead th{background:#fff;color:#222;padding:5px 8px;text-align:left;font-weight:700;font-size:6.5pt;letter-spacing:0.08em;text-transform:uppercase;border-bottom:1px solid #222;border-top:1px solid #222}
  table.items thead th.r{text-align:right}
  table.items tbody td{padding:6px 8px;border-bottom:1px solid #ececec;vertical-align:top;word-wrap:break-word}
  table.items tbody td.r{text-align:right}
  table.items tbody tr:last-child td{border-bottom:1px solid #222}
  .it-name{font-weight:600;color:#222;font-size:8.5pt}
  .it-detail{font-size:7pt;color:#9a9a9a;margin-top:1px}
  .totals{display:flex;justify-content:flex-end;margin-bottom:10px}
  .totals-box{width:62%}
  .t-row{display:flex;justify-content:space-between;padding:3px 10px;font-size:8.5pt;color:#555}
  .t-grand{background:#fff;color:#1a1a1a;font-weight:700;padding:7px 10px;margin-top:5px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1a1a1a;border-bottom:2px solid #1a1a1a}
  .t-grand .lbl{font-size:8.5pt;letter-spacing:0.04em;text-transform:uppercase}
  .t-grand .baht{font-size:11.5pt}
  .pay{background:#fff;border:1px solid #dcdcdc;border-radius:3px;padding:8px 10px;font-size:8pt;color:#555;margin-bottom:9px}
  .pay .h{font-weight:700;color:#1a1a1a;margin-bottom:4px;font-size:7pt;text-transform:uppercase;letter-spacing:0.06em}
  .pay .grid{display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;margin-top:3px}
  .pay .k{color:#8a8a8a;font-weight:600;margin-right:3px}
  .pay .note{margin-top:5px;padding-top:5px;border-top:1px solid #ececec;font-size:7.5pt;color:#777;font-style:italic}
  .sigs{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:8px;font-size:8pt;color:#555}
  .sig{text-align:center}
  .sig .line{border-bottom:1px solid #aaa;height:22px;margin:0 6px}
  .sig .role{color:#9a9a9a;font-size:7pt;margin-top:1px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase}
  .ft{position:absolute;bottom:5mm;left:12mm;right:12mm;text-align:center;font-size:6.5pt;color:#9a9a9a;border-top:1px solid #ececec;padding-top:4px;display:flex;justify-content:space-between}
  .ft .br{font-weight:700;color:#6d6d6d;letter-spacing:0.06em}
  .stamp{position:absolute;top:46mm;right:14mm;transform:rotate(-10deg);border:2px solid #3a3a3a;color:#3a3a3a;padding:4px 14px;border-radius:3px;font-size:13pt;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;opacity:.5;pointer-events:none;text-align:center}
  .stamp small{display:block;font-size:6.5pt;font-weight:500;color:#6d6d6d;text-transform:none;margin-top:1px}
  .overdue-banner{background:#fff;border:1px solid #1a1a1a;border-left:3px solid #1a1a1a;padding:6px 10px;font-size:8pt;color:#222;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center}
  .overdue-banner .lbl{font-weight:700;text-transform:uppercase;letter-spacing:0.04em}
  @media print { html,body{background:#fff} .invoice{margin:0;box-shadow:none;page-break-inside:avoid} .no-print{display:none} }
`;

export default async function PrintInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; rooms?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const period = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : currentPeriod();
  const roomIds = sp.rooms && sp.rooms !== "all" ? sp.rooms.split(",") : undefined;
  const data = await getInvoices(period, roomIds);

  const issueDate = thLongDate(new Date());
  const due = dueLabel(period, data.dueDay);
  const hasPayment = data.bankName || data.bankAccount || data.bankHolder || data.promptpay;
  const logoChar = (data.brand || "M").trim().charAt(0).toUpperCase();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <PrintTrigger />
      {data.items.length === 0 && (
        <p style={{ padding: 24 }}>ไม่มีห้องสำหรับพิมพ์ใบแจ้ง</p>
      )}
      {data.items.map((it, i) => {
        const isPaid = it.status === "paid";
        const isOverdue = it.status === "overdue";
        const isPartial = it.status === "partial";
        return (
          <div className="invoice" key={i}>
            {isPaid && (
              <div className="stamp">
                ชำระแล้ว · PAID
                {it.paidAt && (
                  <small>
                    {it.paidAt.slice(0, 10)}
                    {it.method ? ` · ${METHOD_LABEL[it.method] ?? ""}` : ""}
                  </small>
                )}
              </div>
            )}
            {isOverdue && (
              <div className="stamp">
                เกินกำหนด
                <br />
                OVERDUE
              </div>
            )}

            <div className="lh">
              <div className="lh-l">
                <div className="lh-logo">{logoChar}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="lh-name">{data.brand}</div>
                  {data.tagline && <div className="lh-tag">{data.tagline}</div>}
                  <div className="lh-meta">
                    {data.address && <div>{data.address}</div>}
                    {data.phone && (
                      <div>
                        โทร. {data.phone}
                        {data.taxId ? ` · เลขผู้เสียภาษี ${data.taxId}` : ""}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="lh-r">
                <div className="lbl">เลขที่ / NO.</div>
                <div className="val mono">{invoiceNo(period, it.roomLabel)}</div>
                <div className="lbl">วันที่ออก</div>
                <div className="val" style={{ fontSize: "8.5pt" }}>{issueDate}</div>
                <div className="lbl">ครบกำหนด</div>
                <div className="val due" style={{ fontSize: "8.5pt" }}>{due}</div>
              </div>
            </div>

            <div className="title">
              <div className="t">
                ใบแจ้งค่าเช่า <small>RENTAL INVOICE</small>
              </div>
              <div className="period">ประจำเดือน {thMonthLabel(period)}</div>
            </div>

            <div className="info">
              <div className="info-box">
                <div className="h">เรียน · BILL TO</div>
                <div className="name">{it.tenantName ?? "— ไม่ระบุชื่อ —"}</div>
                {it.tenantPhone && <div className="row">โทร. {it.tenantPhone}</div>}
              </div>
              <div className="info-box">
                <div className="h">ห้องพัก · ROOM</div>
                <div className="name">
                  ห้อง {it.roomLabel}
                  {it.isSuite ? " (Suite)" : ""}
                </div>
                <div className="row">รอบบิล {thMonthLabel(period)}</div>
              </div>
            </div>

            <table className="items">
              <colgroup>
                <col style={{ width: "56%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "24%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>รายการ · DESCRIPTION</th>
                  <th className="r">จำนวน · QTY</th>
                  <th className="r">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div className="it-name">ค่าเช่าห้องพักรายเดือน</div>
                    <div className="it-detail">ห้อง {it.roomLabel} · {thMonthLabel(period)}</div>
                  </td>
                  <td className="r mono">1 เดือน</td>
                  <td className="r mono">{fmtMoney(it.rent)}</td>
                </tr>
                <tr>
                  <td>
                    <div className="it-name">ค่าน้ำประปา</div>
                    <div className="it-detail mono">
                      {it.waterPrev} → {it.waterCurr} หน่วย × {data.waterRate} บ./หน่วย
                    </div>
                  </td>
                  <td className="r mono">{it.waterUsed} หน่วย</td>
                  <td className="r mono">{fmtMoney(it.waterCost)}</td>
                </tr>
                <tr>
                  <td>
                    <div className="it-name">ค่าไฟฟ้า</div>
                    <div className="it-detail mono">
                      {it.elecPrev} → {it.elecCurr} หน่วย × {data.elecRate} บ./หน่วย
                    </div>
                  </td>
                  <td className="r mono">{it.elecUsed} หน่วย</td>
                  <td className="r mono">{fmtMoney(it.elecCost)}</td>
                </tr>
              </tbody>
            </table>

            {isOverdue && (
              <div className="overdue-banner">
                <span className="lbl">⚠ ใบแจ้งนี้เกินกำหนดชำระแล้ว</span>
                <span>กรุณาติดต่อผู้จัดการหอพัก</span>
              </div>
            )}

            <div className="totals">
              <div className="totals-box">
                <div className="t-row">
                  <span>รวมค่าเช่า</span>
                  <span className="mono">{fmtMoney(it.rent)}</span>
                </div>
                <div className="t-row">
                  <span>รวมค่าสาธารณูปโภค</span>
                  <span className="mono">{fmtMoney(it.waterCost + it.elecCost)}</span>
                </div>
                {(isPartial || isPaid) && it.paid > 0 && (
                  <div className="t-row">
                    <span>− รับชำระแล้ว</span>
                    <span className="mono">−{fmtMoney(it.paid)}</span>
                  </div>
                )}
                <div className="t-grand">
                  <span className="lbl">
                    {isPaid ? "ชำระครบแล้ว · PAID IN FULL" : "ยอดที่ต้องชำระ · AMOUNT DUE"}
                  </span>
                  <span className="baht mono">฿ {fmtMoney(isPaid ? 0 : it.remaining)}</span>
                </div>
              </div>
            </div>

            {(hasPayment || data.paymentNote) && (
              <div className="pay">
                <div className="h">💳 ช่องทางการชำระเงิน · PAYMENT METHODS</div>
                {hasPayment && (
                  <div className="grid">
                    {(data.bankName || data.bankAccount) && (
                      <div>
                        <span className="k">ธนาคาร:</span>
                        <span className="mono">{[data.bankName, data.bankAccount].filter(Boolean).join(" ")}</span>
                      </div>
                    )}
                    {data.bankHolder && (
                      <div>
                        <span className="k">ชื่อบัญชี:</span>
                        {data.bankHolder}
                      </div>
                    )}
                    {data.promptpay && (
                      <div>
                        <span className="k">พร้อมเพย์:</span>
                        <span className="mono">{data.promptpay}</span>
                      </div>
                    )}
                  </div>
                )}
                {data.paymentNote && <div className="note">{data.paymentNote}</div>}
              </div>
            )}

            <div className="sigs">
              <div className="sig">
                <div className="line" />
                <div>(....................................)</div>
                <div className="role">ผู้จ่ายเงิน · PAYER</div>
              </div>
              <div className="sig">
                <div className="line" />
                <div>(....................................)</div>
                <div className="role">ผู้รับเงิน · RECEIVED BY</div>
              </div>
            </div>

            <div className="ft">
              <span className="br">{data.brand}</span>
              <span>เอกสารพิมพ์เมื่อ {issueDate}</span>
            </div>
          </div>
        );
      })}
    </>
  );
}
