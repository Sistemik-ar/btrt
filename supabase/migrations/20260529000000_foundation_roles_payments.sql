-- ════════════════════════════════════════════════════════════════════════════
--  F1 — Fundación: roles · memberships · pagos · comprobantes · notificaciones
--       · invitaciones · plan kind
--  Idempotente. Pegar en Supabase Studio → SQL Editor.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Enums ───────────────────────────────────────────────────────────────────
do $$ begin
  create type member_role as enum ('admin','trainer','member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type membership_status as enum ('active','grace','blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_state as enum ('pending','validating','approved','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_kind as enum ('public','hybrid','distance');
exception when duplicate_object then null; end $$;

-- ── members: rol + datos de perfil ──────────────────────────────────────────
alter table public.members
  add column if not exists role        member_role not null default 'member',
  add column if not exists dni         text,
  add column if not exists birth_date  date,
  add column if not exists phone       text;

-- Promover admins por email (los de VITE_ADMIN_EMAIL).
update public.members set role = 'admin'
where lower(email) in ('felipearana17@gmail.com','bandurriastrailrunning@gmail.com')
  and role <> 'admin';

-- ── memberships ─────────────────────────────────────────────────────────────
create table if not exists public.memberships (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  status             membership_status not null default 'active',
  current_period_end date,
  blocked_at         timestamptz,
  updated_at         timestamptz not null default now()
);

-- ── payments (extiende la existente) ────────────────────────────────────────
alter table public.payments
  add column if not exists period  text,            -- 'YYYY-MM'
  add column if not exists state   payment_state default 'pending';

create index if not exists payments_user_period_idx on public.payments (member_id, period);

-- ── payment_proofs (storage de comprobantes) ────────────────────────────────
create table if not exists public.payment_proofs (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid references public.payments(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  period        text not null,                       -- 'YYYY-MM'
  storage_path  text not null,
  uploaded_at   timestamptz not null default now()
);
create index if not exists payment_proofs_user_idx on public.payment_proofs (user_id, period);

-- ── notifications (centro in-app) ───────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,  -- null = broadcast
  kind       text not null default 'info',
  title      text not null,
  body       text,
  url        text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- ── invites (registro con código) ───────────────────────────────────────────
create table if not exists public.invites (
  code       text primary key,
  created_by uuid references auth.users(id),
  max_uses   int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── reusable_messages (mensajes preguardados) ───────────────────────────────
create table if not exists public.reusable_messages (
  id         uuid primary key default gen_random_uuid(),
  category   text not null default 'general',
  title      text not null,
  body       text not null,
  vars       text[] default '{}',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ── weeks: tipo de plan + dueño (para híbrida/distancia) ────────────────────
alter table public.weeks
  add column if not exists kind        plan_kind not null default 'public',
  add column if not exists owner_id    uuid references auth.users(id);  -- distance: a qué atleta

-- ════════════════════════════════════════════════════════════════════════════
--  Helpers (SECURITY DEFINER) para usar en policies
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.current_member_role()
returns member_role language sql stable security definer set search_path = public as $$
  select role from public.members where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from public.members where id = auth.uid()), false)
$$;

create or replace function public.is_staff()  -- admin o entrenador
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('admin','trainer') from public.members where id = auth.uid()), false)
$$;

create or replace function public.has_plan_access()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select status in ('active','grace') from public.memberships where user_id = auth.uid()
  ), true)  -- sin fila de membership todavía = acceso (no romper usuarios actuales)
$$;

-- ════════════════════════════════════════════════════════════════════════════
--  RLS
-- ════════════════════════════════════════════════════════════════════════════

alter table public.memberships     enable row level security;
alter table public.payment_proofs  enable row level security;
alter table public.notifications   enable row level security;
alter table public.invites         enable row level security;
alter table public.reusable_messages enable row level security;

-- memberships: el user ve la suya, staff ve todas, staff escribe
drop policy if exists mship_self_read  on public.memberships;
drop policy if exists mship_staff_all  on public.memberships;
create policy mship_self_read on public.memberships for select to authenticated using (auth.uid() = user_id);
create policy mship_staff_all on public.memberships for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- payment_proofs: el user gestiona los suyos, staff ve todo
drop policy if exists proof_self_all  on public.payment_proofs;
drop policy if exists proof_staff_read on public.payment_proofs;
create policy proof_self_all  on public.payment_proofs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy proof_staff_read on public.payment_proofs for select to authenticated using (public.is_staff());

-- notifications: el user ve las suyas + broadcasts; staff inserta
drop policy if exists notif_self_read   on public.notifications;
drop policy if exists notif_self_update on public.notifications;
drop policy if exists notif_staff_write on public.notifications;
create policy notif_self_read   on public.notifications for select to authenticated using (user_id is null or auth.uid() = user_id);
create policy notif_self_update on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy notif_staff_write on public.notifications for insert to authenticated with check (public.is_staff());

-- invites: solo staff
drop policy if exists invites_staff on public.invites;
create policy invites_staff on public.invites for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- reusable_messages: lectura autenticada, escritura staff
drop policy if exists rmsg_read        on public.reusable_messages;
drop policy if exists rmsg_staff_write on public.reusable_messages;
create policy rmsg_read        on public.reusable_messages for select to authenticated using (true);
create policy rmsg_staff_write on public.reusable_messages for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- weeks: lectura de publicadas con acceso de plan; staff escribe (reemplaza policy admin-by-email)
drop policy if exists weeks_read_published on public.weeks;
drop policy if exists weeks_admin_read_all on public.weeks;
drop policy if exists weeks_admin_write    on public.weeks;
drop policy if exists weeks_read on public.weeks;
drop policy if exists weeks_staff_write on public.weeks;
create policy weeks_read on public.weeks for select to authenticated
  using (
    public.is_staff()
    or (published = true and (kind = 'public' or public.has_plan_access()))
    or (kind = 'distance' and owner_id = auth.uid())
  );
create policy weeks_staff_write on public.weeks for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ════════════════════════════════════════════════════════════════════════════
--  Crear membership al alta de member (extiende handle_new_user)
-- ════════════════════════════════════════════════════════════════════════════
insert into public.memberships (user_id, status)
select id, 'active' from public.members
on conflict (user_id) do nothing;
