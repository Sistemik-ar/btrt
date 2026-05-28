-- ════════════════════════════════════════════════════════════════════════════
--  Realtime — updates en vivo (websockets)
-- ════════════════════════════════════════════════════════════════════════════
--
--  Agrega `weeks` y `week_attendance` a la publicación `supabase_realtime` para
--  que el front reciba cambios por websocket:
--    · weeks            → plan publicado/editado aparece sin recargar.
--    · week_attendance  → inscripciones/bajas refrescan el roster en vivo.
--
--  RLS sigue aplicando a Realtime: cada cliente sólo recibe filas que puede
--  leer. weeks_read_published + wa_read_all ya lo permiten para miembros.
--
--  week_id / id están en la PK de cada tabla → el filtro por semana funciona
--  también en eventos DELETE (replica identity default = PK).
--
--  Idempotente: re-correr no falla si la tabla ya está en la publicación.
-- ════════════════════════════════════════════════════════════════════════════

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
