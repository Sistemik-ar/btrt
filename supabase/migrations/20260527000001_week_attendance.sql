-- ────────────────────────────────────────────────────────────────────────────
--  Per-turno attendance
-- ────────────────────────────────────────────────────────────────────────────
--
--  Each row = one (week, user, turno) confirmation. Turno is identified by
--  a composite text key — `${dayKey}::${turnoText}` — that's stable across
--  plan edits but invalidated if the time string changes.
--
--  PK on (week_id, user_id, turno_key) gives instant idempotent upsert
--  semantics. (week_id, turno_key) index serves "who's coming to this
--  turno" reads.
--
--  RLS model:
--    · everyone authenticated can READ all rows
--      (sports team transparency — members see who else is going)
--    · users can INSERT/DELETE only their own rows
--    · admins can do anything (mirrors weeks RLS)
--
-- ────────────────────────────────────────────────────────────────────────────

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

-- Anyone signed in can see all attendance (counts + names).
CREATE POLICY "wa_read_all"
  ON public.week_attendance
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert/update/delete only their own rows.
CREATE POLICY "wa_self_write"
  ON public.week_attendance
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can clean up anyone (corrections, deletes).
CREATE POLICY "wa_admin_all"
  ON public.week_attendance
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = ANY(ARRAY[
      'felipearana17@gmail.com',
      'bandurriastrailrunning@gmail.com'
    ])
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = ANY(ARRAY[
      'felipearana17@gmail.com',
      'bandurriastrailrunning@gmail.com'
    ])
  );
