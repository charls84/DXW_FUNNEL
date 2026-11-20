-- DXW Funnel · Fase 1 (cierre): links de solo lectura, plantillas DXW, íconos propios e imágenes.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────── Plantillas propias de DXW ─────────────────────────
alter table public.canvases add column is_template boolean not null default false;
create index canvases_templates_idx on public.canvases (is_template) where is_template;

-- ───────────────────────── Íconos propios por workspace ─────────────────────────
create table public.custom_icons (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  url text not null check (url like 'https://%'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index custom_icons_workspace_idx on public.custom_icons (workspace_id, created_at desc);

alter table public.custom_icons enable row level security;
create policy "miembros ven íconos" on public.custom_icons
  for select to authenticated using (public.current_member_role() is not null);
create policy "admins y editores suben íconos" on public.custom_icons
  for insert to authenticated with check (public.current_member_role() in ('admin', 'editor'));
create policy "admins y editores borran íconos" on public.custom_icons
  for delete to authenticated using (public.current_member_role() in ('admin', 'editor'));

-- ───────────────────────── Storage: imágenes de los mapas ─────────────────────────
-- Bucket público con nombres aleatorios: las imágenes deben verse también en links compartidos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('canvas-assets', 'canvas-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'])
on conflict (id) do nothing;

create policy "editores suben imágenes de mapas" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'canvas-assets' and public.current_member_role() in ('admin', 'editor'));
create policy "editores borran imágenes de mapas" on storage.objects
  for delete to authenticated
  using (bucket_id = 'canvas-assets' and public.current_member_role() in ('admin', 'editor'));

-- ───────────────────────── Links de solo lectura ─────────────────────────
create table public.share_links (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid not null references public.canvases (id) on delete cascade,
  token text not null unique check (char_length(token) >= 24),
  password_hash text,
  show_notes boolean not null default false,          -- notas y checklists internos: ocultos por defecto
  expires_at timestamptz,
  revoked_at timestamptz,
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index share_links_canvas_idx on public.share_links (canvas_id, created_at desc);

alter table public.share_links enable row level security;
create policy "miembros ven links" on public.share_links
  for select to authenticated using (public.current_member_role() is not null);
-- Nadie lee el hash de la contraseña desde la API.
revoke select on public.share_links from authenticated, anon;
grant select (id, canvas_id, token, show_notes, expires_at, revoked_at, view_count, last_viewed_at, created_by, created_at)
  on public.share_links to authenticated;

-- Crear link (la contraseña se guarda con bcrypt dentro de Postgres).
create or replace function public.create_share_link(
  p_canvas_id uuid, p_token text, p_password text, p_expires_at timestamptz, p_show_notes boolean
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if public.current_member_role() not in ('admin', 'editor') then
    raise exception 'DXW_FORBIDDEN';
  end if;
  insert into public.share_links (canvas_id, token, password_hash, expires_at, show_notes, created_by)
  values (
    p_canvas_id, p_token,
    case when coalesce(p_password, '') = '' then null else extensions.crypt(p_password, extensions.gen_salt('bf')) end,
    p_expires_at, coalesce(p_show_notes, false), auth.uid()
  )
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.revoke_share_link(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.current_member_role() not in ('admin', 'editor') then
    raise exception 'DXW_FORBIDDEN';
  end if;
  update public.share_links set revoked_at = now() where id = p_id and revoked_at is null;
end $$;

-- Lectura pública por token. Devuelve un estado y, si corresponde, el mapa sin notas internas.
create or replace function public.get_shared_canvas(p_token text, p_password text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_link public.share_links;
  v_canvas public.canvases;
  v_doc jsonb;
begin
  select * into v_link from public.share_links where token = p_token;
  if not found or v_link.revoked_at is not null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_link.expires_at is not null and v_link.expires_at < now() then
    return jsonb_build_object('status', 'expired');
  end if;
  if v_link.password_hash is not null then
    if coalesce(p_password, '') = '' then
      return jsonb_build_object('status', 'password_required');
    end if;
    if extensions.crypt(p_password, v_link.password_hash) <> v_link.password_hash then
      return jsonb_build_object('status', 'wrong_password');
    end if;
  end if;

  select * into v_canvas from public.canvases where id = v_link.canvas_id;
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  v_doc := v_canvas.doc;
  if not v_link.show_notes then
    v_doc := jsonb_set(
      v_doc - 'notes' - 'checklist',
      '{nodes}',
      coalesce(
        (select jsonb_agg((n #- '{data,notes}') #- '{data,checklist}') from jsonb_array_elements(v_doc -> 'nodes') n),
        '[]'::jsonb
      )
    );
  end if;

  update public.share_links set view_count = view_count + 1, last_viewed_at = now() where id = v_link.id;

  return jsonb_build_object('status', 'ok', 'name', v_canvas.name, 'updated_at', v_canvas.updated_at, 'doc', v_doc);
end $$;

-- Qué links de un mapa tienen contraseña (sin exponer el hash).
create or replace function public.share_links_with_password(p_canvas_id uuid) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(id), '{}')
  from public.share_links
  where canvas_id = p_canvas_id and password_hash is not null and public.current_member_role() is not null
$$;
revoke all on function public.share_links_with_password(uuid) from public, anon;
grant execute on function public.share_links_with_password(uuid) to authenticated;

revoke all on function public.get_shared_canvas(text, text) from public;
grant execute on function public.get_shared_canvas(text, text) to anon, authenticated;
revoke all on function public.create_share_link(uuid, text, text, timestamptz, boolean) from public, anon;
grant execute on function public.create_share_link(uuid, text, text, timestamptz, boolean) to authenticated;
revoke all on function public.revoke_share_link(uuid) from public, anon;
grant execute on function public.revoke_share_link(uuid) to authenticated;
