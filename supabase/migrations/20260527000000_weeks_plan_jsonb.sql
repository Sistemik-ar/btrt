-- ────────────────────────────────────────────────────────────────────────────
--  Weeks plan storage
-- ────────────────────────────────────────────────────────────────────────────
--
--  Adds a JSONB column to the existing `weeks` table to store the full rich
--  weekly plan (Roco's HTML format) as a single JSON document.
--
--  Why JSONB instead of normalising:
--    · The plan shape is fluid (activities, turnos, niveles, observación,
--      meetpoint, warnings, etc) and would require many joins if normalised.
--    · The 40-member team only reads `published = true` weeks — load is
--      bounded and cheap as a single SELECT.
--    · Roco edits one week at a time from the admin UI — a single UPDATE
--      replaces the whole document, no diffing needed.
--
--  Schema shape stored in `plan`:
--    {
--      id, published, weekNumber, period, dates, docType, footer,
--      attendance: { label, sub, okUrl, modUrl },
--      activities: [
--        {
--          id,
--          days: ['lun','mar'],                -- ISO-ordered day keys
--          badge: { type: 'quality'|'hills'|'fondazo'|'rest', label },
--          meetpoint: { text, url, pending },
--          objective,
--          activities: [string],
--          note: { strong, text } | null,
--          niveles: [{ type, text }],          -- ini/med/avz
--          durationLabel,
--          structureLabel,
--          turnos: [{ day, text }],            -- day-tagged time slots
--          turnoNote,
--          rest: bool,
--          restBody: { title, lines },
--        }
--      ]
--    }
--
--  Apply via Supabase Studio SQL editor or `supabase db push`.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.weeks
  ADD COLUMN IF NOT EXISTS plan        JSONB,
  ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by  TEXT;

-- Fast lookup of published weeks.
CREATE INDEX IF NOT EXISTS weeks_published_idx
  ON public.weeks (published)
  WHERE published = true;

-- Auto-bump updated_at on UPDATE.
CREATE OR REPLACE FUNCTION public.weeks_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS weeks_touch_updated_at_trg ON public.weeks;
CREATE TRIGGER weeks_touch_updated_at_trg
  BEFORE UPDATE ON public.weeks
  FOR EACH ROW
  EXECUTE FUNCTION public.weeks_touch_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
--  Row Level Security
-- ────────────────────────────────────────────────────────────────────────────
--
--  Goal: everyone authenticated can READ published plans. Only admins (by
--  email) can WRITE. Adjust the admin email list to match your env.
--
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;

-- Replace existing policies if present (idempotent).
DROP POLICY IF EXISTS "weeks_read_published"   ON public.weeks;
DROP POLICY IF EXISTS "weeks_admin_read_all"   ON public.weeks;
DROP POLICY IF EXISTS "weeks_admin_write"      ON public.weeks;

-- Anyone signed in can read PUBLISHED weeks.
CREATE POLICY "weeks_read_published"
  ON public.weeks
  FOR SELECT
  TO authenticated
  USING (published = true);

-- Admins can read all (drafts + published).
CREATE POLICY "weeks_admin_read_all"
  ON public.weeks
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = ANY(ARRAY[
      'felipearana17@gmail.com',
      'bandurriastrailrunning@gmail.com'
    ])
  );

-- Admins can insert/update/delete.
CREATE POLICY "weeks_admin_write"
  ON public.weeks
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
