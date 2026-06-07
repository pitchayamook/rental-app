-- ════════════════════════════════════════════════════════════
--  MyRoom — Supabase schema
--  วิธีใช้: เปิด Supabase → SQL Editor → New query → วางทั้งหมดนี้ → Run
-- ════════════════════════════════════════════════════════════

-- เก็บข้อมูลทั้งระบบของผู้ใช้แต่ละคนเป็น JSON 1 แถว
create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- เปิด Row Level Security: ผู้ใช้เห็น/แก้ได้เฉพาะข้อมูลของตัวเอง
alter table public.app_state enable row level security;

drop policy if exists "own_select" on public.app_state;
create policy "own_select" on public.app_state
  for select using (auth.uid() = user_id);

drop policy if exists "own_insert" on public.app_state;
create policy "own_insert" on public.app_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "own_update" on public.app_state;
create policy "own_update" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own_delete" on public.app_state;
create policy "own_delete" on public.app_state
  for delete using (auth.uid() = user_id);
