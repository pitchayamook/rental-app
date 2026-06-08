import { getPropertyWithSettings } from "@/lib/queries/property";
import { updateSettings } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ property, settings }, sp] = await Promise.all([
    getPropertyWithSettings(),
    searchParams,
  ]);

  return (
    <form action={updateSettings}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ตั้งค่า</h1>
          <p className="text-sm text-neutral-500">
            ข้อมูลหอพัก · บัญชีรับชำระ · อัตราค่าบริการ (ใช้ในใบแจ้งค่าเช่า)
          </p>
        </div>
        <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
          บันทึก
        </button>
      </div>

      {sp.saved && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700">
          ✓ บันทึกการตั้งค่าแล้ว
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="🏠 ข้อมูลหอพัก">
          <Field name="name" label="ชื่อหอพัก" defaultValue={property?.name ?? "MyRoom"} />
          <Field name="tagline" label="คำโปรย" defaultValue={property?.tagline} />
          <Field name="address" label="ที่อยู่" defaultValue={property?.address} textarea />
          <Field name="phone" label="เบอร์โทรศัพท์" defaultValue={property?.phone} />
          <Field name="tax_id" label="เลขผู้เสียภาษี (ถ้ามี)" defaultValue={property?.tax_id} />
        </Card>

        <Card title="💳 บัญชีรับชำระเงิน">
          <Field name="bank_name" label="ธนาคาร" defaultValue={settings?.bank_name} />
          <Field name="bank_account" label="เลขบัญชี" defaultValue={settings?.bank_account} />
          <Field name="bank_holder" label="ชื่อบัญชี" defaultValue={settings?.bank_holder} />
          <Field name="promptpay" label="พร้อมเพย์ (เบอร์/เลขบัตร)" defaultValue={settings?.promptpay} />
          <Field name="payment_note" label="หมายเหตุการชำระเงิน" defaultValue={settings?.payment_note} textarea />
        </Card>

        <Card title="⚙️ อัตราค่าบริการ">
          <Field name="water_rate" label="ค่าน้ำ (บาท/หน่วย)" type="number" step="0.5" defaultValue={settings?.water_rate ?? 25} />
          <Field name="elec_rate" label="ค่าไฟ (บาท/หน่วย)" type="number" step="0.5" defaultValue={settings?.elec_rate ?? 7} />
          <Field name="default_price" label="ค่าเช่าเริ่มต้น (บาท/เดือน)" type="number" step="100" defaultValue={settings?.default_price ?? 2500} />
        </Card>

        <Card title="📅 รอบการชำระ">
          <Field
            name="due_day"
            label="วันครบกำหนดชำระ (ของเดือนถัดไป)"
            type="number"
            min={1}
            max={28}
            defaultValue={settings?.due_day ?? 5}
          />
          <p className="text-xs text-neutral-500">
            เช่น &quot;5&quot; = บิลเดือน พ.ค. ครบกำหนด 5 มิ.ย.
          </p>
        </Card>
      </div>

      <div className="mt-5 flex justify-end">
        <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
          บันทึก
        </button>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-neutral-700">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  textarea = false,
  step,
  min,
  max,
}: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  type?: string;
  textarea?: boolean;
  step?: string;
  min?: number;
  max?: number;
}) {
  const cls =
    "w-full rounded-xl bg-neutral-100 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">{label}</span>
      {textarea ? (
        <textarea name={name} rows={2} defaultValue={defaultValue ?? ""} className={cls} />
      ) : (
        <input
          name={name}
          type={type}
          step={step}
          min={min}
          max={max}
          defaultValue={defaultValue ?? ""}
          className={cls}
        />
      )}
    </label>
  );
}
