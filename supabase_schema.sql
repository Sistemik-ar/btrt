-- Run this in Supabase SQL Editor

create table if not exists members (
  id uuid references auth.users primary key,
  name text,
  email text,
  status text default 'active' check (status in ('active', 'moroso', 'inactive')),
  last_payment timestamptz,
  wa_id text unique,           -- número WhatsApp con código de país, sin + (ej: 5492944123456)
  created_at timestamptz default now()
);

create table if not exists weeks (
  id text primary key, -- formato: 'YYYY-MM-DD' (lunes de la semana)
  published boolean default false,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid default gen_random_uuid() primary key,
  week_id text references weeks(id) on delete cascade,
  day text not null,
  time text,
  description text,
  location text,
  reminder_sent boolean default false,
  feedback_sent boolean default false,
  created_at timestamptz default now()
);

create table if not exists attendance (
  session_id uuid references sessions(id) on delete cascade,
  member_id uuid references members(id) on delete cascade,
  member_name text,                    -- fallback si el número no está vinculado a un member
  week_id text references weeks(id) on delete cascade,
  day text,
  confirmed_at timestamptz default now(),
  primary key (session_id, member_id)
);

create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references sessions(id) on delete set null,
  member_id uuid references members(id) on delete set null,
  member_name text,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- RLS (Row Level Security)
alter table members enable row level security;
alter table weeks enable row level security;
alter table sessions enable row level security;
alter table attendance enable row level security;

-- members: cada uno ve solo su fila, admin ve todo
create policy "members_self" on members
  for all using (auth.uid() = id);

-- weeks/sessions: todos los autenticados leen, nadie escribe desde el cliente
-- (el admin escribe igual porque tiene su uid en members)
create policy "weeks_read" on weeks
  for select using (auth.role() = 'authenticated');

create policy "weeks_write" on weeks
  for all using (
    auth.uid() in (select id from members where email = current_setting('app.admin_email', true))
  );

create policy "sessions_read" on sessions
  for select using (auth.role() = 'authenticated');

create policy "sessions_write" on sessions
  for all using (
    auth.uid() in (select id from members where email = current_setting('app.admin_email', true))
  );

-- attendance: cada uno ve y toca sus propias filas; admin ve todo
create policy "attendance_own" on attendance
  for all using (auth.uid() = member_id);

create policy "attendance_admin_read" on attendance
  for select using (
    auth.uid() in (select id from members where email = current_setting('app.admin_email', true))
  );

-- feedback: admin-only
create policy "feedback_admin" on feedback
  for all using (
    auth.uid() in (select id from members where email = current_setting('app.admin_email', true))
  );

-- Pagos registrados por el bot de WhatsApp
create table if not exists payments (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references members(id) on delete set null,
  member_name text not null,          -- nombre detectado por el bot
  amount numeric not null,            -- monto detectado (ej: 73000)
  proof_text text,                    -- mensaje original de WhatsApp
  source text default 'whatsapp',
  wa_id text,                          -- número WA del que mandó el comprobante
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by text,                    -- nombre del admin que aprobó (string, no FK)
  approved_at timestamptz,
  created_at timestamptz default now()
);

alter table payments enable row level security;
alter table feedback enable row level security;

-- Solo admin puede ver y modificar pagos
create policy "payments_admin" on payments
  for all using (
    auth.uid() in (select id from members where email = current_setting('app.admin_email', true))
  );

-- Función para auto-crear member al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into members (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
