-- Demo seed: Semana 25 de mayo 2026
-- Run this in Supabase SQL Editor after running supabase_schema.sql

-- Week record
insert into weeks (id, published) values ('2026-05-25', true)
on conflict (id) do update set published = true;

-- Clear any existing sessions for this week (idempotent re-run)
delete from sessions where week_id = '2026-05-25';

-- ── MARTES · Calidad / Llano ───────────────────────────────────────────────
insert into sessions (week_id, day, time, location, description) values (
  '2026-05-25',
  'Martes',
  'Mar 9hs · Mar 18hs',
  'Pista de Atletismo · Km 6 Av. de los Pioneros',
  $${
    "badge": { "type": "quality", "label": "Calidad · Llano" },
    "warning": "LUNES 25 — FERIADO NACIONAL · SIN ENTRENAMIENTO",
    "objective": "Activación aeróbica + trabajo de ritmos controlados y técnica de carrera en llano",
    "activities": [
      "Entrada en calor dinámica — movilidad articular + trote suave 8-10 min",
      "Técnica de carrera: postura, apoyo, cadencia — ejercicios en pista o llano (10-15 min)",
      "Bloque central: rodaje aeróbico Z1-Z2 con cambios de ritmo cortos (30\"/30\" o 1'/1')",
      "Coordinación básica y saltabilidad: skipping, talones, lateral runs",
      "Vuelta a la calma + elongación activa de cadena posterior"
    ],
    "niveles": [
      { "tag": "INI", "type": "ini", "text": "30 min trote Z1 continuo + técnica básica de pisada. Sin cambios de ritmo aún." },
      { "tag": "MED", "type": "med", "text": "45 min Z2 + 4×1' al 75% FC con recuperación activa. Coordinación completa." },
      { "tag": "AVZ", "type": "avz", "text": "60 min Z2 + 6×1'30\" al 80% FC + coordinación y saltabilidad completa." }
    ],
    "duration": "90 min sesión total",
    "durationPct": 70
  }$$
);

-- ── MIÉRCOLES / JUEVES · Cuestas / Terreno ────────────────────────────────
insert into sessions (week_id, day, time, location, description) values (
  '2026-05-25',
  'Miércoles/Jueves',
  'Mié 18hs · Jue 9hs · Jue 18hs',
  'Cerro Otto · Frente a la YPF, Km 1 Av. de los Pioneros',
  $${
    "badge": { "type": "hills", "label": "Cuestas · Terreno" },
    "objective": "Fuerza específica en subida + adaptación músculo-tendinosa a la pendiente + terreno técnico",
    "activities": [
      "Entrada en calor en llano 10 min + activación glúteos, isquiotibiales y tobillos",
      "Series en cuesta corta-media (6-15% pendiente): postura, inclinación adelante, empuje de brazos",
      "Trabajo excéntrico de bajada: frenada progresiva, rodilla semiflexionada, mirada adelante — no es recuperación, es estímulo",
      "Terreno técnico: raíces, piedras, irregularidades — lectura del terreno y propiocepción",
      "Vuelta a la calma + elongación cuádriceps, sóleo y psoas"
    ],
    "niveles": [
      { "tag": "INI", "type": "ini", "text": "6×30\" cuesta suave (6-8%), caminar bajada, foco técnico exclusivo. Sin apurar." },
      { "tag": "MED", "type": "med", "text": "8×1' cuesta media (8-12%), trote bajada controlado, 2' recuperación entre series." },
      { "tag": "AVZ", "type": "avz", "text": "10×90\" cuesta progresiva (10-15%), bajada activa técnica, descanso corto 90\"." }
    ],
    "duration": "90 – 110 min sesión total",
    "durationPct": 80
  }$$
);

-- ── VIERNES · Recuperación ────────────────────────────────────────────────
insert into sessions (week_id, day, time, location, description) values (
  '2026-05-25',
  'Viernes',
  '',
  null,
  $${
    "badge": { "type": "rest", "label": "Recuperación" },
    "restText": "Recuperación activa opcional — Caminata suave · natación · movilidad — 20 a 30 min máximo. No exigir. El cuerpo asimila el estímulo acumulado."
  }$$
);

-- ── SÁBADO · Fondo de Montaña ─────────────────────────────────────────────
insert into sessions (week_id, day, time, location, description) values (
  '2026-05-25',
  'Sábado',
  'Salida 8:30hs',
  'Cerro López · Punto de encuentro a confirmar según clima',
  $${
    "badge": { "type": "fondazo", "label": "🏔 Fondo de Montaña · D+700–1000m" },
    "objective": "Volumen aeróbico prolongado en montaña + adaptación metabólica al esfuerzo continuo en terreno real",
    "activities": [
      "Salida en Z1-Z2 estricto — nadie arranca rápido, sin excepciones",
      "Caminar las subidas fuertes es correcto y estratégico — no es debilidad",
      "Hidratación y nutrición en movimiento: práctica de estrategia de carrera real",
      "Bajada técnica: paso tranquilo, rodilla semiflexionada, no golpear con talón",
      "Evaluación grupal breve al finalizar — sensaciones, zona de trabajo, ejecución"
    ],
    "note": "Test de intensidad: Si el corredor no puede mantener conversación durante el recorrido, el ritmo es incorrecto. Z2 es la zona, no la excepción.",
    "niveles": [
      { "tag": "INI", "type": "ini", "text": "60–90 min · D+200-400m · pace muy cómodo · sin presión de distancia · terminar descansado" },
      { "tag": "MED", "type": "med", "text": "2–3 hs · D+500-700m · Z2 sostenido · caminar subidas >15% · hidratación cada 20-25 min" },
      { "tag": "AVZ", "type": "avz", "text": "3–5 hs · D+700-1000m · Z2 con picos Z3 en subida · bajada activa y técnica · gestión energética planificada" }
    ],
    "hbox": {
      "title": "⚠ Clave período base",
      "content": "El fondo no es para sufrir. Es para construir base aeróbica. Un corredor que termina devastado no asimiló el estímulo — lo destruyó. Más tiempo en Z2 ahora = más techo después."
    },
    "duration": "3 – 5 hs · D+700–1000m",
    "durationPct": 100
  }$$
);

-- ── DOMINGO · Descanso ────────────────────────────────────────────────────
insert into sessions (week_id, day, time, location, description) values (
  '2026-05-25',
  'Domingo',
  '',
  null,
  $${
    "badge": { "type": "rest", "label": "Descanso" },
    "restText": "Descanso completo — Priorizar sueño y nutrición post-fondo. Elongación suave si el corredor lo desea. Nada más."
  }$$
);
