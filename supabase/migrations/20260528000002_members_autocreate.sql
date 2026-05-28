-- ════════════════════════════════════════════════════════════════════════════
--  Auto-crear fila en members al registrarse un usuario
-- ════════════════════════════════════════════════════════════════════════════
--
--  Hasta ahora, un usuario invitado por magic link quedaba en auth.users sin
--  fila en members → aparecía como "Miembro" en el roster y sin perfil.
--
--  Este trigger crea (o completa) la fila members con id = auth.users.id,
--  tomando el nombre de user_metadata si vino (full_name / name) o, si no,
--  el prefijo del email. Idempotente vía ON CONFLICT.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.members (id, email, name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      split_part(NEW.email, '@', 1)
    ),
    'active'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name  = COALESCE(public.members.name, EXCLUDED.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill: crear members para usuarios que ya existen en auth.users y no la tienen.
INSERT INTO public.members (id, email, name, status)
SELECT u.id,
       u.email,
       COALESCE(
         NULLIF(u.raw_user_meta_data ->> 'full_name', ''),
         NULLIF(u.raw_user_meta_data ->> 'name', ''),
         split_part(u.email, '@', 1)
       ),
       'active'
FROM auth.users u
LEFT JOIN public.members m ON m.id = u.id
WHERE m.id IS NULL;
