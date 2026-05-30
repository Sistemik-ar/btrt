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
