-- DXW Funnel · Fase 1: mapas (canvases) e historial de versiones.

create type public.canvas_kind as enum ('funnel', 'process');

create table public.canvases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  kind public.canvas_kind not null default 'funnel',
  tags text[] not null default '{}',
  doc jsonb not null default '{"schema":1,"nodes":[],"edges":[]}'::jsonb,
  version integer not null default 1,                         -- control de concurrencia optimista
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index canvases_workspace_idx on public.canvases (workspace_id, updated_at desc);

create table public.canvas_revisions (
  id uuid primary key default gen_random_uuid(),
  canvas_id uuid not null references public.canvases (id) on delete cascade,
  doc jsonb not null,
  note text check (note is null or char_length(note) <= 200),
  is_auto boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index canvas_revisions_canvas_idx on public.canvas_revisions (canvas_id, created_at desc);

create trigger canvases_updated_at before update on public.canvases
  for each row execute function public.set_updated_at();

-- ───────────────────────── RLS ─────────────────────────
alter table public.canvases enable row level security;
alter table public.canvas_revisions enable row level security;

create policy "miembros ven mapas" on public.canvases
  for select to authenticated using (public.current_member_role() is not null);
create policy "admins y editores crean mapas" on public.canvases
  for insert to authenticated with check (public.current_member_role() in ('admin', 'editor'));
create policy "admins y editores editan mapas" on public.canvases
  for update to authenticated
  using (public.current_member_role() in ('admin', 'editor'))
  with check (public.current_member_role() in ('admin', 'editor'));
create policy "admins y editores eliminan mapas" on public.canvases
  for delete to authenticated using (public.current_member_role() in ('admin', 'editor'));

create policy "miembros ven versiones" on public.canvas_revisions
  for select to authenticated using (public.current_member_role() is not null);
create policy "admins y editores guardan versiones" on public.canvas_revisions
  for insert to authenticated with check (public.current_member_role() in ('admin', 'editor'));
