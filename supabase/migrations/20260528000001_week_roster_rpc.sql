-- ════════════════════════════════════════════════════════════════════════════
--  week_roster(p_week_id)  — quién está anotado a cada turno
-- ════════════════════════════════════════════════════════════════════════════
--
--  Devuelve (turno_key, user_id, name) uniendo week_attendance con members.
--  SECURITY DEFINER: corre con permisos del owner, así expone SOLO el nombre
--  (no email / wa_id / pagos) a cualquier miembro logueado, sin necesidad de
--  abrir un SELECT amplio sobre members.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.week_roster(p_week_id DATE)
RETURNS TABLE (turno_key TEXT, user_id UUID, name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wa.turno_key, wa.user_id, COALESCE(m.name, 'Miembro') AS name
  FROM public.week_attendance wa
  LEFT JOIN public.members m ON m.id = wa.user_id
  WHERE wa.week_id = p_week_id
  ORDER BY name
$$;

GRANT EXECUTE ON FUNCTION public.week_roster(DATE) TO authenticated;
