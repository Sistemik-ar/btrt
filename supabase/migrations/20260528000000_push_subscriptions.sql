-- ════════════════════════════════════════════════════════════════════════════
--  Web Push subscriptions
-- ════════════════════════════════════════════════════════════════════════════
--
--  One row per device/browser a member subscribed from. The server (bot or
--  edge function) reads these + sends notifications with the VAPID private key.
--
--  endpoint is the natural unique id (one push channel per browser).
-- ════════════════════════════════════════════════════════════════════════════

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

-- Users manage only their own subscriptions.
CREATE POLICY "ps_self_write"
  ON public.push_subscriptions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all (to send broadcasts). Sending itself runs server-side
-- with the service-role key, which bypasses RLS anyway.
CREATE POLICY "ps_admin_read"
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = ANY(ARRAY[
      'felipearana17@gmail.com',
      'bandurriastrailrunning@gmail.com'
    ])
  );
