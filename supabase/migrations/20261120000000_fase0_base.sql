-- DXW Funnel · Fase 0: organización, miembros del equipo, workspaces y RLS.
-- Ejecutar en Supabase → SQL Editor (o `supabase db push`).

-- ───────────────────────── Configuración ─────────────────────────
create table public.app_settings (
  id boolean primary key default true check (id),           -- una sola fila
  allowed_email_domain text not null
);
insert into public.app_settings (allowed_email_domain) values ('doux.work');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
insert into public.organizations (name) values ('DOUX.WORK');

-- ───────────────────────── Miembros ─────────────────────────
create type public.member_role as enum ('admin', 'editor', 'viewer');

create table public.members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id),
  email text not null unique,
  full_name text,
  avatar_url text,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Workspaces ─────────────────────────
create type public.workspace_type as enum ('internal', 'client');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  type public.workspace_type not null default 'client',
  main_url text check (main_url is null or char_length(main_url) <= 200),
  timezone text not null default 'America/Bogota',
  currency char(3) not null default 'USD',
  logo_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workspaces_org_idx on public.workspaces (organization_id);

-- ───────────────────────── Funciones ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger members_updated_at before update on public.members
  for each row execute function public.set_updated_at();
create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function public.set_updated_at();

-- Rol del usuario actual (null si no es miembro). security definer evita recursión de RLS.
create or replace function public.current_member_role()
returns public.member_role
language sql stable security definer set search_path = public as $$
  select role from public.members where user_id = auth.uid()
$$;

-- Alta automática: solo correos del dominio permitido. El primer miembro queda como admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_domain text;
  v_org uuid;
  v_role public.member_role;
begin
  select allowed_email_domain into v_domain from public.app_settings where id;
  if new.email is null or lower(split_part(new.email, '@', 2)) <> lower(v_domain) then
    return new;                                               -- no es del equipo: sin membresía
  end if;

  select id into v_org from public.organizations order by created_at limit 1;
  v_role := case when exists (select 1 from public.members) then 'viewer' else 'admin' end;

  insert into public.members (user_id, organization_id, email, full_name, avatar_url, role)
  values (
    new.id, v_org, lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url',
    v_role
  )
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nunca dejar al equipo sin administradores.
create or replace function public.keep_one_admin()
returns trigger language plpgsql as $$
begin
  if old.role = 'admin'
     and (tg_op = 'DELETE' or new.role <> 'admin')
     and (select count(*) from public.members where role = 'admin') <= 1 then
    raise exception 'DXW_LAST_ADMIN' using hint = 'Debe quedar al menos un administrador.';
  end if;
  return coalesce(new, old);
end $$;

create trigger members_keep_one_admin before update or delete on public.members
  for each row execute function public.keep_one_admin();

-- ───────────────────────── RLS ─────────────────────────
alter table public.app_settings enable row level security;
alter table public.organizations enable row level security;
alter table public.members enable row level security;
alter table public.workspaces enable row level security;

create policy "miembros leen configuración" on public.app_settings
  for select to authenticated using (public.current_member_role() is not null);

create policy "miembros leen la organización" on public.organizations
  for select to authenticated using (public.current_member_role() is not null);

create policy "miembros ven al equipo" on public.members
  for select to authenticated using (public.current_member_role() is not null);
create policy "admins cambian roles" on public.members
  for update to authenticated
  using (public.current_member_role() = 'admin')
  with check (public.current_member_role() = 'admin');

create policy "miembros ven workspaces" on public.workspaces
  for select to authenticated using (public.current_member_role() is not null);
create policy "admins y editores crean workspaces" on public.workspaces
  for insert to authenticated
  with check (public.current_member_role() in ('admin', 'editor'));
create policy "admins y editores editan workspaces" on public.workspaces
  for update to authenticated
  using (public.current_member_role() in ('admin', 'editor'))
  with check (public.current_member_role() in ('admin', 'editor'));
create policy "admins eliminan workspaces" on public.workspaces
  for delete to authenticated using (public.current_member_role() = 'admin');

-- Los miembros solo pueden cambiar su rol a través de un admin; nadie edita email/organización desde la app.
revoke update on public.members from authenticated;
grant update (role) on public.members to authenticated;
