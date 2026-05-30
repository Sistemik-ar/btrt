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
