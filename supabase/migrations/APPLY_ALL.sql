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
