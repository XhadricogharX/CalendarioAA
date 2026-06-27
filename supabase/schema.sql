-- ============================================================================
--  Adelante Andalucía · Calendario — Esquema de base de datos (Supabase)
--  Pega y ejecuta TODO este archivo en:  Supabase → SQL Editor → New query
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabla de eventos / convocatorias
-- ----------------------------------------------------------------------------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  event_date   date not null,
  start_time   time,
  title        text not null check (char_length(title) between 1 and 160),
  description  text check (char_length(description) <= 2000),
  category     text not null default 'otro'
               check (category in ('manifestacion','concentracion','reunion','asamblea','acto','otro')),
  location     text check (char_length(location) <= 160),
  image_path   text,
  image_width  integer,
  image_height integer,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null default auth.uid()
);

create index if not exists events_event_date_idx on public.events (event_date);

-- Provincia del evento (se añade aunque la tabla ya existiera de antes).
alter table public.events add column if not exists province text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'events_province_check') then
    alter table public.events add constraint events_province_check
      check (province is null or province in
        ('almeria','cadiz','cordoba','granada','huelva','jaen','malaga','sevilla','andalucia'));
  end if;
end $$;
create index if not exists events_province_idx on public.events (province);

-- ----------------------------------------------------------------------------
-- 2) Seguridad a nivel de fila (RLS)
--    · Lectura: cualquiera (web pública)
--    · Escritura: solo usuarios autenticados (administradores del partido)
-- ----------------------------------------------------------------------------
alter table public.events enable row level security;

drop policy if exists "events_public_read"        on public.events;
drop policy if exists "events_auth_insert"         on public.events;
drop policy if exists "events_auth_update"         on public.events;
drop policy if exists "events_auth_delete"         on public.events;

create policy "events_public_read"
  on public.events for select
  to anon, authenticated
  using (true);

create policy "events_auth_insert"
  on public.events for insert
  to authenticated
  with check (true);

create policy "events_auth_update"
  on public.events for update
  to authenticated
  using (true) with check (true);

create policy "events_auth_delete"
  on public.events for delete
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 3) Almacenamiento de imágenes (bucket público para lectura)
--    Importante: un bucket PÚBLICO sirve las imágenes por su URL pública sin
--    necesidad de una política SELECT. Por eso NO creamos una política de
--    lectura sobre storage.objects (evita el aviso "clients can list all files"
--    y que se pueda listar todo el bucket). Solo damos escritura a los admins.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = true;

-- Quitamos cualquier política SELECT pública previa (la que dispara el aviso).
drop policy if exists "event_images_public_read"   on storage.objects;
drop policy if exists "event_images_auth_insert"   on storage.objects;
drop policy if exists "event_images_auth_update"   on storage.objects;
drop policy if exists "event_images_auth_delete"   on storage.objects;

create policy "event_images_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-images');

create policy "event_images_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-images')
  with check (bucket_id = 'event-images');

create policy "event_images_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-images');

-- ----------------------------------------------------------------------------
-- 4) Asistencias (RSVP) — sin inicio de sesión
--    · INSERT: cualquiera puede confirmar (nombre y apellido obligatorios)
--    · SELECT (nombres): SOLO administradores autenticados
--    · El público obtiene SOLO el recuento (función de la sección 5)
-- ----------------------------------------------------------------------------
create table if not exists public.attendances (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events (id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) between 1 and 60),
  last_name  text not null check (char_length(trim(last_name)) between 1 and 80),
  created_at timestamptz not null default now()
);

-- Identificador anónimo de dispositivo (anti-duplicados y anti-abuso).
alter table public.attendances add column if not exists device_id uuid;

create index if not exists attendances_event_idx on public.attendances (event_id);

-- Restricciones de seguridad (idempotentes; NOT VALID no afecta a filas previas).
do $$ begin
  -- 1 sola confirmación por dispositivo y evento
  if not exists (select 1 from pg_constraint where conname = 'attendances_unique_device') then
    alter table public.attendances
      add constraint attendances_unique_device unique (event_id, device_id);
  end if;
  -- las nuevas filas deben incluir device_id
  if not exists (select 1 from pg_constraint where conname = 'attendances_device_required') then
    alter table public.attendances
      add constraint attendances_device_required check (device_id is not null) not valid;
  end if;
  -- nombre/apellido: solo letras (con acentos), espacio, guion, apóstrofo y punto
  if not exists (select 1 from pg_constraint where conname = 'attendances_first_name_chk') then
    alter table public.attendances
      add constraint attendances_first_name_chk
      check (first_name ~ '^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ''.\-]{0,59}$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'attendances_last_name_chk') then
    alter table public.attendances
      add constraint attendances_last_name_chk
      check (last_name ~ '^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ''.\-]{0,79}$') not valid;
  end if;
end $$;

alter table public.attendances enable row level security;

drop policy if exists "attendances_public_insert" on public.attendances;
drop policy if exists "attendances_admin_read"     on public.attendances;
drop policy if exists "attendances_admin_delete"   on public.attendances;

-- Cualquiera puede apuntarse (no hay login).
create policy "attendances_public_insert"
  on public.attendances for insert
  to anon, authenticated
  with check (true);

-- Solo los administradores pueden leer los nombres.
create policy "attendances_admin_read"
  on public.attendances for select
  to authenticated
  using (true);

-- Solo los administradores pueden borrar (moderación); los usuarios no.
create policy "attendances_admin_delete"
  on public.attendances for delete
  to authenticated
  using (true);

-- Límite de ritmo: máx. 8 confirmaciones por dispositivo y minuto (anti-spam).
create or replace function public.attendances_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare recent int;
begin
  select count(*) into recent
  from public.attendances
  where device_id = new.device_id
    and created_at > now() - interval '1 minute';
  if recent >= 8 then
    raise exception 'Demasiadas confirmaciones seguidas. Espera un momento e inténtalo de nuevo.';
  end if;
  return new;
end $$;

drop trigger if exists attendances_rate_limit_trg on public.attendances;
create trigger attendances_rate_limit_trg
  before insert on public.attendances
  for each row execute function public.attendances_rate_limit();

-- ----------------------------------------------------------------------------
-- 5) Recuento público de asistentes (solo el número, NUNCA los nombres)
--    Función SECURITY DEFINER: el público solo puede obtener el total.
-- ----------------------------------------------------------------------------
create or replace function public.attendance_counts(event_ids uuid[])
returns table (event_id uuid, total integer)
language sql
stable
security definer
set search_path = public
as $$
  select a.event_id, count(*)::int as total
  from public.attendances a
  where a.event_id = any(event_ids)
  group by a.event_id;
$$;

revoke all on function public.attendance_counts(uuid[]) from public;
grant execute on function public.attendance_counts(uuid[]) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 6) Dispositivos anónimos (id generado en la 1ª visita; apoya el anti-abuso)
-- ----------------------------------------------------------------------------
create table if not exists public.devices (
  id         uuid primary key,
  created_at timestamptz not null default now()
);

alter table public.devices enable row level security;

drop policy if exists "devices_public_insert" on public.devices;
drop policy if exists "devices_admin_read"    on public.devices;

create policy "devices_public_insert"
  on public.devices for insert
  to anon, authenticated
  with check (true);

create policy "devices_admin_read"
  on public.devices for select
  to authenticated
  using (true);

-- ----------------------------------------------------------------------------
-- 7) Ampliaciones: coordenadas, varias imágenes, auditoría, límites de bucket,
--    uso de almacenamiento y anti-abuso por IP (Edge Function).
-- ----------------------------------------------------------------------------

-- Coordenadas (geocodificadas al guardar) + galería de imágenes + updated_at
alter table public.events add column if not exists lat double precision;
alter table public.events add column if not exists lon double precision;
alter table public.events add column if not exists images jsonb not null default '[]'::jsonb;
alter table public.events add column if not exists updated_at timestamptz not null default now();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists events_touch_updated on public.events;
create trigger events_touch_updated
  before update on public.events
  for each row execute function public.touch_updated_at();

-- Auditoría de eventos (quién crea/edita/borra). Solo lectura para admins.
create table if not exists public.event_audit (
  id         bigint generated always as identity primary key,
  event_id   uuid,
  action     text not null,
  actor      uuid,
  title      text,
  at         timestamptz not null default now()
);

alter table public.event_audit enable row level security;
drop policy if exists "event_audit_admin_read" on public.event_audit;
create policy "event_audit_admin_read"
  on public.event_audit for select to authenticated using (true);

create or replace function public.audit_events()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    insert into public.event_audit (event_id, action, actor, title)
    values (old.id, 'delete', auth.uid(), old.title);
    return old;
  else
    insert into public.event_audit (event_id, action, actor, title)
    values (new.id, lower(tg_op), auth.uid(), new.title);
    return new;
  end if;
end $$;

drop trigger if exists events_audit_trg on public.events;
create trigger events_audit_trg
  after insert or update or delete on public.events
  for each row execute function public.audit_events();

-- Límites del bucket de imágenes (tamaño máx. 1,5 MB; solo WebP).
update storage.buckets
  set file_size_limit = 1572864,
      allowed_mime_types = array['image/webp']
  where id = 'event-images';

-- Uso de almacenamiento (solo admins): bytes totales y nº de imágenes.
create or replace function public.storage_usage()
returns table (total_bytes bigint, file_count bigint)
language sql stable security definer set search_path = storage, public as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)::bigint, count(*)::bigint
  from storage.objects
  where bucket_id = 'event-images';
$$;
revoke all on function public.storage_usage() from public, anon;
grant execute on function public.storage_usage() to authenticated;

-- Anti-abuso por IP para la Edge Function (guarda solo un hash de la IP).
create table if not exists public.attendance_throttle (
  id         bigint generated always as identity primary key,
  ip_hash    text not null,
  created_at timestamptz not null default now()
);
create index if not exists attendance_throttle_idx
  on public.attendance_throttle (ip_hash, created_at);
alter table public.attendance_throttle enable row level security;
-- Sin políticas: solo accesible con la service_role (la Edge Function).

-- ============================================================================
--  LISTO.
--  Recuerda:
--   · Authentication → Providers → Email: DESACTIVA "Allow new users to sign up"
--     (así solo entran los administradores que tú crees a mano).
--   · Authentication → Users → "Add user": crea cada administrador
--     (marca "Auto Confirm User").
-- ============================================================================
