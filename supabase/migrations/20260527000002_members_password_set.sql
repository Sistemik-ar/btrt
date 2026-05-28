-- ────────────────────────────────────────────────────────────────────────────
--  Members.password_set
-- ────────────────────────────────────────────────────────────────────────────
--
--  Tracks whether a member has set a password (vs only logged in via magic link).
--    · ResetPassword.jsx flips it to true after a successful password save.
--    · Admin.jsx resetPassword flips it back to false when sending a reset email,
--      so the "Creá tu contraseña" banner reappears for that user.
--
--  Per-user state needs to live in the DB — localStorage is per-browser and
--  can't be cleared by Roco from another machine.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS password_set BOOLEAN NOT NULL DEFAULT false;

-- Optional one-time backfill — uncomment if existing members already have passwords
-- and you don't want to bother them with the banner:
-- UPDATE public.members SET password_set = true;

-- ── Self-update policy (idempotent) ──
DROP POLICY IF EXISTS "members_self_update" ON public.members;
CREATE POLICY "members_self_update"
  ON public.members FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── Admin can update any member ──
DROP POLICY IF EXISTS "members_admin_update" ON public.members;
CREATE POLICY "members_admin_update"
  ON public.members FOR UPDATE
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
