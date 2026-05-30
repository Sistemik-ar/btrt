-- ════════════════════════════════════════════════════════════════════════════
--  BANDURRIAS — Migración consolidada (pegar TODO en Supabase Studio → SQL Editor)
--  Incluye: weeks.plan (JSONB) + week_attendance + members.password_set
--  Idempotente: se puede correr varias veces sin romper nada.
--  Admins: ajustá la lista de emails si cambia.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1) weeks.plan ───────────────────────────────────────────────────────────
ALTER TABLE public.weeks
  ADD COLUMN IF NOT EXISTS plan        JSONB,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by  TEXT;

CREATE INDEX IF NOT EXISTS weeks_published_idx
  ON public.weeks (published) WHERE published = true;

CREATE OR REPLACE FUNCTION public.weeks_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS weeks_touch_updated_at_trg ON public.weeks;
CREATE TRIGGER weeks_touch_updated_at_trg
  BEFORE UPDATE ON public.weeks
  FOR EACH ROW EXECUTE FUNCTION public.weeks_touch_updated_at();

ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "weeks_read_published" ON public.weeks;
DROP POLICY IF EXISTS "weeks_admin_read_all" ON public.weeks;
DROP POLICY IF EXISTS "weeks_admin_write"    ON public.weeks;

CREATE POLICY "weeks_read_published"
  ON public.weeks FOR SELECT TO authenticated
  USING (published = true);

CREATE POLICY "weeks_admin_read_all"
  ON public.weeks FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = ANY(ARRAY[
    'felipearana17@gmail.com', 'bandurriastrailrunning@gmail.com'
  ]));

CREATE POLICY "weeks_admin_write"
  ON public.weeks FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = ANY(ARRAY[
    'felipearana17@gmail.com', 'bandurriastrailrunning@gmail.com'
  ]))
  WITH CHECK ((auth.jwt() ->> 'email') = ANY(ARRAY[
    'felipearana17@gmail.com', 'bandurriastrailrunning@gmail.com'
  ]));

-- ── 2) week_attendance ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.week_attendance (
  week_id      DATE        NOT NULL,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turno_key    TEXT        NOT NULL,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (week_id, user_id, turno_key)
);

CREATE INDEX IF NOT EXISTS week_attendance_lookup_idx
  ON public.week_attendance (week_id, turno_key);

ALTER TABLE public.week_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_read_all"   ON public.week_attendance;
DROP POLICY IF EXISTS "wa_self_write" ON public.week_attendance;
DROP POLICY IF EXISTS "wa_admin_all"  ON public.week_attendance;

CREATE POLICY "wa_read_all"
  ON public.week_attendance FOR SELECT TO authenticated USING (true);

CREATE POLICY "wa_self_write"
  ON public.week_attendance FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wa_admin_all"
  ON public.week_attendance FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = ANY(ARRAY[
    'felipearana17@gmail.com', 'bandurriastrailrunning@gmail.com'
  ]))
  WITH CHECK ((auth.jwt() ->> 'email') = ANY(ARRAY[
    'felipearana17@gmail.com', 'bandurriastrailrunning@gmail.com'
  ]));

-- ── 3) members.password_set ──────────────────────────────────────────────────
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS password_set BOOLEAN NOT NULL DEFAULT false;

-- Opcional: si los miembros actuales ya tienen contraseña y no querés molestarlos,
-- descomentá la línea siguiente:
-- UPDATE public.members SET password_set = true;

DROP POLICY IF EXISTS "members_self_update"  ON public.members;
DROP POLICY IF EXISTS "members_admin_update" ON public.members;

CREATE POLICY "members_self_update"
  ON public.members FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "members_admin_update"
  ON public.members FOR UPDATE TO authenticated
  USING ((auth.jwt() ->> 'email') = ANY(ARRAY[
    'felipearana17@gmail.com', 'bandurriastrailrunning@gmail.com'
  ]))
  WITH CHECK ((auth.jwt() ->> 'email') = ANY(ARRAY[
    'felipearana17@gmail.com', 'bandurriastrailrunning@gmail.com'
  ]));

-- ── 4) push_subscriptions (notificaciones) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint   TEXT        PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  p256dh     TEXT        NOT NULL,
  auth       TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ps_self_write" ON public.push_subscriptions;
DROP POLICY IF EXISTS "ps_admin_read" ON public.push_subscriptions;

CREATE POLICY "ps_self_write"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ps_admin_read"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING ((auth.jwt() ->> 'email') = ANY(ARRAY[
    'felipearana17@gmail.com', 'bandurriastrailrunning@gmail.com'
  ]));

-- ── 5) week_roster RPC (quién va a cada turno, con nombre) ───────────────────
CREATE OR REPLACE FUNCTION public.week_roster(p_week_id DATE)
RETURNS TABLE (turno_key TEXT, user_id UUID, name TEXT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT wa.turno_key, wa.user_id, COALESCE(m.name, 'Miembro') AS name
  FROM public.week_attendance wa
  LEFT JOIN public.members m ON m.id = wa.user_id
  WHERE wa.week_id = p_week_id
  ORDER BY name
$$;
GRANT EXECUTE ON FUNCTION public.week_roster(DATE) TO authenticated;

-- ── 6) Realtime (updates en vivo por websocket) ─────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'weeks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.weeks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'week_attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.week_attendance;
  END IF;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
--  Verificación rápida (corré aparte si querés confirmar):
--    SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'weeks' AND column_name = 'plan';
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- F1 — Fundación (roles, memberships, pagos, comprobantes, notif, invites)
-- Ver archivo completo: 20260529000000_foundation_roles_payments.sql
-- ════════════════════════════════════════════════════════════════════════════
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


-- ════════════════════════════════════════════════════════════════════════════
-- F2 — Pagos (settings, storage comprobantes, bloqueo día 11)
-- ════════════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════════
--  F2 — Pagos: settings configurables · storage de comprobantes · bloqueo día 11
--  Idempotente.
-- ════════════════════════════════════════════════════════════════════════════

-- ── app_settings (cuota + día de vencimiento, editable por admin) ───────────
create table if not exists public.app_settings (
  id          int primary key default 1,
  fee_amount  numeric not null default 15000,
  due_day     int not null default 10,      -- último día para pagar; se bloquea el due_day+1
  currency    text not null default 'ARS',
  updated_at  timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);
insert into public.app_settings (id) values (1) on conflict (id) do nothing;

alter table public.app_settings enable row level security;
drop policy if exists settings_read  on public.app_settings;
drop policy if exists settings_write on public.app_settings;
create policy settings_read  on public.app_settings for select to authenticated using (true);
create policy settings_write on public.app_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── payments: asegurar columnas usadas por el flujo ─────────────────────────
alter table public.payments
  add column if not exists reviewed_by  uuid references auth.users(id),
  add column if not exists reviewed_at  timestamptz,
  add column if not exists note         text;

-- ── Storage bucket privado para comprobantes ────────────────────────────────
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

-- Policies de storage: el user gestiona su carpeta {uid}/..., staff lee todo.
drop policy if exists "proofs_user_rw"   on storage.objects;
drop policy if exists "proofs_staff_read" on storage.objects;

create policy "proofs_user_rw" on storage.objects for all to authenticated
  using (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "proofs_staff_read" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and public.is_staff());

-- ════════════════════════════════════════════════════════════════════════════
--  Bloqueo automático de no-pagos (corre cada día; bloquea pasado due_day)
-- ════════════════════════════════════════════════════════════════════════════
--
--  Lógica: si hoy > due_day del mes y el miembro NO tiene un payment
--  'approved' para el período actual (YYYY-MM), su membership pasa a 'blocked'.
--  Los que pagaron quedan 'active'. Staff nunca se bloquea.
--
create or replace function public.refresh_membership_blocks()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_due   int;
  v_period text := to_char(now(), 'YYYY-MM');
  v_past_due boolean;
begin
  select due_day into v_due from public.app_settings where id = 1;
  v_past_due := extract(day from now()) > coalesce(v_due, 10);

  -- Activar a los que pagaron este período
  update public.memberships m
  set status = 'active', blocked_at = null, updated_at = now()
  where exists (
    select 1 from public.payments p
    where p.member_id = m.user_id and p.period = v_period and p.state = 'approved'
  ) and m.status <> 'active';

  -- Bloquear a los que NO pagaron, si ya pasó el vencimiento (excepto staff)
  if v_past_due then
    update public.memberships m
    set status = 'blocked', blocked_at = now(), updated_at = now()
    where m.status <> 'blocked'
      and not exists (
        select 1 from public.payments p
        where p.member_id = m.user_id and p.period = v_period and p.state = 'approved'
      )
      and not exists (
        select 1 from public.members mb where mb.id = m.user_id and mb.role in ('admin','trainer')
      );
  end if;
end $$;

-- Programar con pg_cron si está disponible (Supabase: Database → Extensions → pg_cron).
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('refresh-membership-blocks', '5 0 * * *', 'select public.refresh_membership_blocks()');
  end if;
exception when others then null; end $$;

-- Si pg_cron no está, el bot (node-cron) puede llamar refresh_membership_blocks()
-- vía RPC diariamente. Ver btrt-bot/jobs.js.


-- ════════════════════════════════════════════════════════════════════════════
-- F3 — Notificaciones (recordatorio día 10 + realtime)
-- ════════════════════════════════════════════════════════════════════════════
-- ════════════════════════════════════════════════════════════════════════════
--  F3 — Notificaciones in-app: recordatorio día 10 + realtime
--  Idempotente.
-- ════════════════════════════════════════════════════════════════════════════

-- Realtime para que la campana reciba inserts en vivo.
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;

-- ── Recordatorio de cuota (día = due_day): inserta UN broadcast por día ──────
create or replace function public.notify_payment_due()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_due int;
  v_today int := extract(day from now())::int;
begin
  select due_day into v_due from public.app_settings where id = 1;
  if v_today <> coalesce(v_due, 10) then return; end if;

  -- evitar duplicar si ya se mandó hoy
  if exists (
    select 1 from public.notifications
    where kind = 'payment' and created_at::date = now()::date and user_id is null
  ) then return; end if;

  insert into public.notifications (user_id, kind, title, body, url)
  values (null, 'payment',
    'Último día para pagar la cuota',
    'Hoy vence el plazo para subir el comprobante de la cuota del mes. Subilo desde tu inicio.',
    '/inicio');
end $$;

-- Programar con pg_cron si está disponible (corre 9am).
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('notify-payment-due', '0 9 * * *', 'select public.notify_payment_due()');
  end if;
exception when others then null; end $$;

-- Si no hay pg_cron, el bot (node-cron) puede llamar notify_payment_due() vía RPC.
