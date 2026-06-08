import Link from "next/link";
import { notFound } from "next/navigation";
import { getRoomDetail } from "@/lib/queries/room-detail";
import { saveRoom, recordPayment } from "./actions";
import { currentPeriod, thMonthLabel } from "@/lib/domain/thai-date";
import { formatBaht } from "@/lib/domain/money";

const STATUS_LABEL: Record<string, string> = {
  paid: "ชำระแล้ว",
  partial: "ชำระบางส่วน",
  overdue: "เกินกำหนด",
  unpaid: "ค้างชำระ",
  none: "—",
};

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ roomId }, sp] = await Promise.all([params, searchParams]);
  const period = currentPeriod();
  const detail = await getRoomDetail(roomId, period);
  if (!detail) notFound();

  const { room, tenant, lease, payment, billed, status } = detail;
  const paid = payment?.paid_amount ?? 0;
  const remaining = Math.max(0, billed - paid);

  const saveRoomBound = saveRoom.bind(null, roomId);
  const recordPaymentBound = recordPayment.bind(null, roomId, period);

  return (
    <div>
      <Link href="/rooms" className="text-sm text-blue-600">
        ← กลับห้องพัก
      </Link>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">ห้อง {room.label}</h1>

      {sp.saved && (
        <p className="mt-3 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
          ✓ บันทึก{sp.saved === "payment" ? "การชำระเงิน" : "ข้อมูลห้อง"}แล้ว
        </p>
      )}

      {/* ── ฟอร์มข้อมูลห้อง / ผู้เช่า / มัดจำ ── */}
      <form action={saveRoomBound} className="mt-4 space-y-4">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-700">ข้อมูลห้อง</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select name="status" label="สถานะห้อง" defaultValue={room.status}
              options={[["occupied", "มีผู้เช่า"], ["vacant", "ว่าง"], ["maintenance", "ซ่อมบำรุง"]]} />
            <Field name="price" label="ราคาเช่า (บาท/เดือน)" type="number" defaultValue={room.price} />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-700">ข้อมูลผู้เช่า</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="tenant_name" label="ชื่อ-นามสกุล" defaultValue={tenant?.full_name} wide />
            <Field name="phone" label="เบอร์โทรศัพท์" defaultValue={tenant?.phone} />
            <Field name="id_card" label="เลขบัตรประชาชน" defaultValue={tenant?.id_card} />
            <Field name="start_date" label="วันที่เริ่มเช่า" type="date" defaultValue={lease?.start_date} />
            <Field name="end_date" label="วันหมดสัญญา" type="date" defaultValue={lease?.end_date} />
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-neutral-700">เงินมัดจำ / ประกัน</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field name="deposit" label="จำนวนเงินมัดจำ (บาท)" type="number" defaultValue={lease?.deposit ?? ""} />
            <Field name="deposit_date" label="วันที่รับมัดจำ" type="date" defaultValue={lease?.deposit_date} />
            <Select name="deposit_status" label="สถานะมัดจำ" defaultValue={lease?.deposit_status ?? "holding"}
              options={[["holding", "ถือไว้ (ยังไม่คืน)"], ["returned", "คืนแล้ว"], ["deducted", "หักค่าเสียหาย"]]} />
          </div>
          <div className="mt-3">
            <Textarea name="note" label="บันทึกเพิ่มเติม" defaultValue={room.note} />
          </div>
        </section>

        <div className="flex justify-end">
          <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
            บันทึกข้อมูลห้อง
          </button>
        </div>
      </form>

      {/* ── ฟอร์มรับชำระเงิน ── */}
      <form action={recordPaymentBound} className="mt-4">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">
            การชำระเงิน · {thMonthLabel(period)}
          </h2>
          <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl bg-neutral-50 p-3 text-center">
            <div>
              <div className="text-xs text-neutral-500">ยอดเรียกเก็บ</div>
              <div className="font-bold">{formatBaht(billed)}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">คงค้าง</div>
              <div className={`font-bold ${remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatBaht(remaining)}
              </div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">สถานะ</div>
              <div className="font-bold">{STATUS_LABEL[status]}</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="paid_amount" label="จำนวนที่ชำระแล้ว (บาท)" type="number" defaultValue={paid || ""} />
            <Field name="paid_at" label="วันที่ชำระ" type="date" defaultValue={payment?.paid_at?.slice(0, 10)} />
            <Select name="method" label="ช่องทาง" defaultValue={payment?.method ?? ""}
              options={[["", "— ไม่ระบุ —"], ["cash", "เงินสด"], ["transfer", "โอนผ่านธนาคาร"], ["promptpay", "พร้อมเพย์"], ["other", "อื่นๆ"]]} />
            <Field name="note" label="หมายเหตุ" defaultValue={payment?.note} />
          </div>
          <div className="mt-4 flex justify-end">
            <button className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white">
              บันทึกการชำระ
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}

const cls =
  "w-full rounded-xl bg-neutral-100 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";

function Field({
  name, label, defaultValue, type = "text", wide = false,
}: {
  name: string; label: string; defaultValue?: string | number | null; type?: string; wide?: boolean;
}) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue ?? ""} className={cls} />
    </label>
  );
}

function Textarea({ name, label, defaultValue }: { name: string; label: string; defaultValue?: string | null }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      <textarea name={name} rows={2} defaultValue={defaultValue ?? ""} className={cls} />
    </label>
  );
}

function Select({
  name, label, defaultValue, options,
}: {
  name: string; label: string; defaultValue?: string; options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      <select name={name} defaultValue={defaultValue} className={cls}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
