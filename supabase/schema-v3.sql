-- ════════════════════════════════════════════════════════════
--  MyRoom — relational schema (v3)  [แอปเวอร์ชัน Next.js]
--  ใช้แทน app_state (JSON ก้อนเดียว) — แตกเป็นตารางจริง
--  วิธีใช้: Supabase → SQL Editor → New query → วางทั้งหมด → Run
--  หมายเหตุ: ตารางใหม่ "อยู่ร่วม" กับ app_state เดิมได้ ระหว่างเปลี่ยนผ่าน
-- ════════════════════════════════════════════════════════════

-- 1) PROPERTIES — หอพัก (เผื่อหลายหอต่อเจ้าของ)
create table if not exists public.properties (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users(id) on delete cascade,
  name       text not null default 'MyRoom',
  tagline    text,
  address    text,
  phone      text,
  tax_id     text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists properties_owner_idx on public.properties (owner_id);

-- 2) PROPERTY_SETTINGS — ตั้งค่าต่อหอ (1:1)
create table if not exists public.property_settings (
  property_id   uuid primary key references public.properties(id) on delete cascade,
  due_day       smallint not null default 5 check (due_day between 1 and 28),
  water_rate    numeric(10,2) not null default 25,
  elec_rate     numeric(10,2) not null default 7,
  default_price numeric(12,2) not null default 2500,
  bank_name     text,
  bank_account  text,
  bank_holder   text,
  promptpay     text,
  payment_note  text,
  updated_at    timestamptz not null default now()
);

-- 3) ROOMS — ห้อง (สถานะห้อง ไม่ผูกตัวตนผู้เช่า)
create table if not exists public.rooms (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  code        text not null,                 -- = room.id เดิม ("05","10-11")
  label       text not null,
  is_suite    boolean not null default false,
  price       numeric(12,2) not null default 0,
  status      text not null default 'vacant'
              check (status in ('occupied','vacant','maintenance')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (property_id, code)
);
create index if not exists rooms_property_idx on public.rooms (property_id);

-- 4) TENANTS — ตัวตนผู้เช่า (ใช้ซ้ำข้ามห้อง/ข้ามครั้งได้)
create table if not exists public.tenants (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  full_name   text not null,
  phone       text,
  id_card     text,
  user_id     uuid references auth.users(id),  -- เผื่ออนาคต: ผู้เช่ามี login เอง
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists tenants_property_idx on public.tenants (property_id);
create index if not exists tenants_user_idx on public.tenants (user_id);

-- 5) LEASES — สัญญาเช่า (เชื่อม room↔tenant ตามช่วงเวลา → เก็บประวัติผู้เช่าเก่า)
create table if not exists public.leases (
  id             uuid primary key default gen_random_uuid(),
  property_id    uuid not null references public.properties(id) on delete cascade,
  room_id        uuid not null references public.rooms(id) on delete cascade,
  tenant_id      uuid not null references public.tenants(id) on delete restrict,
  start_date     date,
  end_date       date,
  monthly_price  numeric(12,2),
  deposit        numeric(12,2) not null default 0,
  deposit_date   date,
  deposit_status text not null default 'holding'
                 check (deposit_status in ('holding','returned','deducted')),
  is_active      boolean not null default true,
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists leases_room_idx on public.leases (room_id);
create index if not exists leases_tenant_idx on public.leases (tenant_id);
create index if not exists leases_property_idx on public.leases (property_id);
create unique index if not exists leases_one_active_per_room
  on public.leases (room_id) where (is_active);

-- 6) METER_READINGS — มิเตอร์ ต่อห้อง ต่อเดือน
create table if not exists public.meter_readings (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  period      date not null,                  -- วันที่ 1 ของเดือน (YYYY-MM-01)
  water_prev  numeric(12,2) not null default 0,
  water_curr  numeric(12,2) not null default 0,
  elec_prev   numeric(12,2) not null default 0,
  elec_curr   numeric(12,2) not null default 0,
  saved       boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (room_id, period)
);
create index if not exists meter_property_period_idx on public.meter_readings (property_id, period);

-- 7) PAYMENTS — การชำระ ต่อห้อง ต่อเดือน (snapshot ยอดบิลกันค่าเพี้ยนเมื่อแก้ rate)
create table if not exists public.payments (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.rooms(id) on delete cascade,
  lease_id     uuid references public.leases(id) on delete set null,
  property_id  uuid not null references public.properties(id) on delete cascade,
  period       date not null,
  billed_rent  numeric(12,2),
  billed_water numeric(12,2),
  billed_elec  numeric(12,2),
  paid_amount  numeric(12,2) not null default 0,
  paid_at      timestamptz,
  method       text check (method in ('cash','transfer','promptpay','other')),
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (room_id, period)
);
create index if not exists payments_property_period_idx on public.payments (property_id, period);
create index if not exists payments_lease_idx on public.payments (lease_id);

-- 8) EXPENSES + EXPENSE_ITEMS — ค่าใช้จ่ายส่วนกลาง ต่อหอ ต่อเดือน
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  period      date not null,
  water       numeric(12,2) not null default 0,
  elec        numeric(12,2) not null default 0,
  car_loan    numeric(12,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (property_id, period)
);

create table if not exists public.expense_items (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  label      text not null,
  amount     numeric(12,2) not null default 0,
  sort_order smallint not null default 0
);
create index if not exists expense_items_expense_idx on public.expense_items (expense_id);

-- ════════════════════════════════════════════════════════════
--  RLS — เจ้าของเห็น/แก้เฉพาะข้อมูลหอตัวเอง
--  แพตเทิร์น: property_id in (select id from properties where owner_id = auth.uid())
-- ════════════════════════════════════════════════════════════
alter table public.properties        enable row level security;
alter table public.property_settings enable row level security;
alter table public.rooms             enable row level security;
alter table public.tenants           enable row level security;
alter table public.leases            enable row level security;
alter table public.meter_readings    enable row level security;
alter table public.payments          enable row level security;
alter table public.expenses          enable row level security;
alter table public.expense_items     enable row level security;

-- properties: ผูกด้วย owner_id โดยตรง
drop policy if exists "own_properties" on public.properties;
create policy "own_properties" on public.properties
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- helper macro (เขียนซ้ำในแต่ละ policy): หอที่ฉันเป็นเจ้าของ
--   property_id in (select id from public.properties where owner_id = (select auth.uid()))

-- ตารางที่มี property_id ตรง ๆ
do $$
declare t text;
begin
  foreach t in array array['property_settings','rooms','tenants','leases','meter_readings','payments','expenses']
  loop
    execute format($f$
      drop policy if exists "own_%1$s" on public.%1$s;
      create policy "own_%1$s" on public.%1$s
        for all to authenticated
        using (property_id in (select id from public.properties where owner_id = (select auth.uid())))
        with check (property_id in (select id from public.properties where owner_id = (select auth.uid())));
    $f$, t);
  end loop;
end $$;

-- expense_items ไม่มี property_id → เช็คผ่าน parent
drop policy if exists "own_expense_items" on public.expense_items;
create policy "own_expense_items" on public.expense_items
  for all to authenticated
  using (exists (
    select 1 from public.expenses e
    join public.properties p on p.id = e.property_id
    where e.id = expense_id and p.owner_id = (select auth.uid())))
  with check (exists (
    select 1 from public.expenses e
    join public.properties p on p.id = e.property_id
    where e.id = expense_id and p.owner_id = (select auth.uid())));

-- ════════════════════════════════════════════════════════════
--  MIGRATION — ย้าย app_state.data (JSON) → ตารางจริง (idempotent)
--  เรียก: select public.migrate_app_state(auth.uid());  (หรือผ่าน RPC)
-- ════════════════════════════════════════════════════════════
create or replace function public.migrate_app_state(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_data   jsonb;
  v_prop   uuid;
  r        jsonb;
  mk       text;
  v_room   uuid;
  v_period date;
  v_tenant uuid;
begin
  -- กันสั่ง migrate ของคนอื่นเมื่อ expose เป็น RPC
  if p_user is null or (auth.uid() is not null and p_user <> auth.uid()) then
    raise exception 'not allowed';
  end if;

  select data into v_data from public.app_state where user_id = p_user;
  if v_data is null or v_data->'rooms' is null then return; end if;

  select id into v_prop from public.properties where owner_id = p_user order by created_at limit 1;
  if v_prop is null then
    insert into public.properties(owner_id, name, tagline, address, phone, tax_id)
    values (p_user,
            coalesce(v_data->'settings'->>'brandName','MyRoom'),
            v_data->'settings'->>'tagline', v_data->'settings'->>'address',
            v_data->'settings'->>'phone', v_data->'settings'->>'taxId')
    returning id into v_prop;
  end if;

  insert into public.property_settings(property_id, due_day, water_rate, elec_rate,
         default_price, bank_name, bank_account, bank_holder, promptpay, payment_note)
  values (v_prop,
          coalesce((v_data->'settings'->>'dueDay')::int,5),
          coalesce((v_data->'settings'->>'waterRate')::numeric,25),
          coalesce((v_data->'settings'->>'elecRate')::numeric,7),
          coalesce((v_data->'settings'->>'defaultPrice')::numeric,2500),
          v_data->'settings'->>'bankName', v_data->'settings'->>'bankAccount',
          v_data->'settings'->>'bankHolder', v_data->'settings'->>'promptPay',
          v_data->'settings'->>'paymentNote')
  on conflict (property_id) do update set
     due_day=excluded.due_day, water_rate=excluded.water_rate, elec_rate=excluded.elec_rate,
     default_price=excluded.default_price, bank_name=excluded.bank_name,
     bank_account=excluded.bank_account, bank_holder=excluded.bank_holder,
     promptpay=excluded.promptpay, payment_note=excluded.payment_note, updated_at=now();

  -- expenses + items
  for mk in select jsonb_object_keys(coalesce(v_data->'expenses','{}'::jsonb)) loop
    v_period := (mk || '-01')::date;
    insert into public.expenses(property_id, period, water, elec, car_loan)
    values (v_prop, v_period,
            coalesce((v_data->'expenses'->mk->>'water')::numeric,0),
            coalesce((v_data->'expenses'->mk->>'elec')::numeric,0),
            coalesce((v_data->'expenses'->mk->>'carLoan')::numeric,0))
    on conflict (property_id, period) do update set
       water=excluded.water, elec=excluded.elec, car_loan=excluded.car_loan;
    delete from public.expense_items ei using public.expenses e
      where ei.expense_id=e.id and e.property_id=v_prop and e.period=v_period;
    insert into public.expense_items(expense_id, label, amount, sort_order)
    select e.id, x->>'label', coalesce((x->>'amount')::numeric,0), (ord-1)::smallint
    from public.expenses e,
         jsonb_array_elements(coalesce(v_data->'expenses'->mk->'other','[]'::jsonb))
           with ordinality as t(x, ord)
    where e.property_id=v_prop and e.period=v_period;
  end loop;

  -- rooms (+ tenant/lease/meters/payments)
  for r in select * from jsonb_array_elements(v_data->'rooms') loop
    insert into public.rooms(property_id, code, label, is_suite, price, status, note)
    values (v_prop, r->>'id', coalesce(r->>'label', r->>'id'),
            coalesce((r->>'isSuite')::boolean,false), coalesce((r->>'price')::numeric,0),
            coalesce(r->>'status','vacant'), r->>'note')
    on conflict (property_id, code) do update set
       label=excluded.label, is_suite=excluded.is_suite, price=excluded.price,
       status=excluded.status, note=excluded.note, updated_at=now()
    returning id into v_room;

    if coalesce(r->>'tenant','') <> '' then
      select id into v_tenant from public.tenants
        where property_id=v_prop and full_name=r->>'tenant'
              and coalesce(phone,'')=coalesce(r->>'phone','') limit 1;
      if v_tenant is null then
        insert into public.tenants(property_id, full_name, phone, id_card)
        values (v_prop, r->>'tenant', r->>'phone', r->>'idCard')
        returning id into v_tenant;
      end if;
      insert into public.leases(property_id, room_id, tenant_id, start_date, end_date,
             monthly_price, deposit, deposit_date, deposit_status, is_active, note)
      values (v_prop, v_room, v_tenant,
              nullif(r->>'startDate','')::date, nullif(r->>'endDate','')::date,
              coalesce((r->>'price')::numeric,0), coalesce((r->>'deposit')::numeric,0),
              nullif(r->>'depositDate','')::date,
              coalesce(r->>'depositStatus','holding'), true, r->>'note')
      on conflict (room_id) where (is_active) do update set
         tenant_id=excluded.tenant_id, start_date=excluded.start_date,
         end_date=excluded.end_date, deposit=excluded.deposit,
         deposit_date=excluded.deposit_date, deposit_status=excluded.deposit_status,
         note=excluded.note, updated_at=now();
    end if;

    for mk in select jsonb_object_keys(coalesce(r->'meters','{}'::jsonb)) loop
      v_period := (mk || '-01')::date;
      insert into public.meter_readings(room_id, property_id, period,
             water_prev, water_curr, elec_prev, elec_curr, saved)
      values (v_room, v_prop, v_period,
              coalesce((r->'meters'->mk->>'wPrev')::numeric,0),
              coalesce((r->'meters'->mk->>'wCurr')::numeric,0),
              coalesce((r->'meters'->mk->>'ePrev')::numeric,0),
              coalesce((r->'meters'->mk->>'eCurr')::numeric,0),
              coalesce((r->'meters'->mk->>'saved')::boolean,false))
      on conflict (room_id, period) do update set
         water_prev=excluded.water_prev, water_curr=excluded.water_curr,
         elec_prev=excluded.elec_prev, elec_curr=excluded.elec_curr,
         saved=excluded.saved, updated_at=now();
    end loop;

    for mk in select jsonb_object_keys(coalesce(r->'payments','{}'::jsonb)) loop
      v_period := (mk || '-01')::date;
      insert into public.payments(room_id, property_id, period, paid_amount, paid_at, method, note)
      values (v_room, v_prop, v_period,
              coalesce((r->'payments'->mk->>'paidAmount')::numeric,0),
              nullif(r->'payments'->mk->>'paidAt','')::timestamptz,
              nullif(r->'payments'->mk->>'method',''),
              r->'payments'->mk->>'note')
      on conflict (room_id, period) do update set
         paid_amount=excluded.paid_amount, paid_at=excluded.paid_at,
         method=excluded.method, note=excluded.note, updated_at=now();
    end loop;
  end loop;
end $$;
