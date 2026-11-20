-- DXW Funnel · Fase 3: eventos del CRM propio de DXW (webhook firmado + importación CSV).
-- El CRM corre en Neon; DXW Funnel recibe eventos y no necesita acceso a esa base.

-- ───────────────────────── Conexión por workspace ─────────────────────────
create table public.crm_connections (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  ingest_key text not null unique check (char_length(ingest_key) >= 20),   -- va en la URL del webhook
  secret text not null check (char_length(secret) >= 32),                  -- firma HMAC-SHA256 del cuerpo
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz,
  last_event_at timestamptz,
  events_received bigint not null default 0
);

alter table public.crm_connections enable row level security;
-- Solo administradores ven la clave y el secreto; el resto del equipo no los necesita.
create policy "admins ven la conexión CRM" on public.crm_connections
  for select to authenticated using (public.current_member_role() = 'admin');
create policy "admins crean la conexión CRM" on public.crm_connections
  for insert to authenticated with check (public.current_member_role() = 'admin');
create policy "admins rotan el secreto" on public.crm_connections
  for update to authenticated using (public.current_member_role() = 'admin') with check (public.current_member_role() = 'admin');
create policy "admins borran la conexión" on public.crm_connections
  for delete to authenticated using (public.current_member_role() = 'admin');

-- Estado de la conexión visible para todo el equipo (sin clave ni secreto).
create or replace function public.crm_connection_status(p_workspace_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.current_member_role() is null then null else (
    select jsonb_build_object('connected', true, 'created_at', created_at, 'last_event_at', last_event_at, 'events_received', events_received)
    from public.crm_connections where workspace_id = p_workspace_id
  ) end
$$;
revoke all on function public.crm_connection_status(uuid) from public, anon;
grant execute on function public.crm_connection_status(uuid) to authenticated;

-- ───────────────────────── Eventos ─────────────────────────
create type public.crm_event_type as enum ('lead_created', 'stage_changed', 'appointment', 'deal_won', 'deal_lost', 'payment');

create table public.crm_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  external_id text not null check (char_length(external_id) between 1 and 200),  -- id del evento en el CRM (evita duplicados)
  type public.crm_event_type not null,
  occurred_at timestamptz not null,
  contact_id text not null check (char_length(contact_id) between 1 and 200),
  email_hash text,                                    -- sha256 del email en minúsculas; nunca el email
  lead_source text check (lead_source is null or char_length(lead_source) <= 120),
  pipeline text check (pipeline is null or char_length(pipeline) <= 120),
  stage text check (stage is null or char_length(stage) <= 120),
  value numeric(14, 2) check (value is null or value >= 0),
  currency char(3),
  owner text check (owner is null or char_length(owner) <= 120),
  origin text not null default 'webhook' check (origin in ('webhook', 'csv')),
  received_at timestamptz not null default now(),
  unique (workspace_id, external_id)
);
create index crm_events_ws_time_idx on public.crm_events (workspace_id, occurred_at);
create index crm_events_ws_contact_idx on public.crm_events (workspace_id, contact_id, occurred_at);

alter table public.crm_events enable row level security;
create policy "miembros ven eventos" on public.crm_events
  for select to authenticated using (public.current_member_role() is not null);
create policy "admins y editores importan eventos" on public.crm_events
  for insert to authenticated with check (public.current_member_role() in ('admin', 'editor') and origin = 'csv');
create policy "admins borran eventos" on public.crm_events
  for delete to authenticated using (public.current_member_role() = 'admin');

-- ───────────────────────── Ingesta firmada (webhook) ─────────────────────────
-- Llamada por /api/crm/ingest/[key] sin sesión. Verifica la firma HMAC del cuerpo exacto y guarda hasta 500 eventos.
create or replace function public.ingest_crm_events(p_key text, p_signature text, p_body text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_conn public.crm_connections;
  v_expected text;
  v_payload jsonb;
  v_events jsonb;
  v_ev jsonb;
  v_accepted int := 0;
  v_duplicates int := 0;
  v_rejected int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_type text;
  v_time timestamptz;
  v_contact text;
  v_ext text;
  v_email text;
  v_value numeric;
  v_rows int;
begin
  select * into v_conn from public.crm_connections where ingest_key = p_key;
  if not found then
    return jsonb_build_object('status', 'unknown_key');
  end if;

  v_expected := 'sha256=' || encode(extensions.hmac(convert_to(p_body, 'UTF8'), convert_to(v_conn.secret, 'UTF8'), 'sha256'), 'hex');
  if p_signature is null or p_signature <> v_expected then
    return jsonb_build_object('status', 'bad_signature');
  end if;

  begin
    v_payload := p_body::jsonb;
  exception when others then
    return jsonb_build_object('status', 'bad_json');
  end;

  v_events := case when jsonb_typeof(v_payload -> 'events') = 'array' then v_payload -> 'events' else jsonb_build_array(v_payload) end;
  if jsonb_array_length(v_events) > 500 then
    return jsonb_build_object('status', 'too_many_events', 'max', 500);
  end if;

  for v_ev in select * from jsonb_array_elements(v_events) loop
    begin
      v_type := v_ev ->> 'type';
      v_ext := nullif(btrim(v_ev ->> 'id'), '');
      v_contact := nullif(btrim(coalesce(v_ev #>> '{contact,id}', v_ev ->> 'contact_id')), '');
      v_time := (v_ev ->> 'occurred_at')::timestamptz;
      v_email := lower(btrim(coalesce(v_ev #>> '{contact,email}', v_ev ->> 'contact_email')));
      v_value := nullif(v_ev ->> 'value', '')::numeric;

      if v_type not in ('lead_created', 'stage_changed', 'appointment', 'deal_won', 'deal_lost', 'payment')
         or v_ext is null or v_contact is null or v_time is null
         or v_time > now() + interval '1 day' or (v_value is not null and v_value < 0) then
        raise exception 'invalid';
      end if;

      insert into public.crm_events (workspace_id, external_id, type, occurred_at, contact_id, email_hash, lead_source, pipeline, stage, value, currency, owner, origin)
      values (
        v_conn.workspace_id, left(v_ext, 200), v_type::public.crm_event_type, v_time, left(v_contact, 200),
        case when coalesce(v_email, '') like '%@%' then encode(extensions.digest(v_email, 'sha256'), 'hex') end,
        left(nullif(btrim(coalesce(v_ev #>> '{contact,source}', v_ev ->> 'source')), ''), 120),
        left(nullif(btrim(v_ev ->> 'pipeline'), ''), 120),
        left(nullif(btrim(v_ev ->> 'stage'), ''), 120),
        v_value,
        case when upper(v_ev ->> 'currency') ~ '^[A-Z]{3}$' then upper(v_ev ->> 'currency') end,
        left(nullif(btrim(v_ev ->> 'owner'), ''), 120),
        'webhook'
      )
      on conflict (workspace_id, external_id) do nothing;
      get diagnostics v_rows = row_count;
      if v_rows = 1 then v_accepted := v_accepted + 1; else v_duplicates := v_duplicates + 1; end if;
    exception when others then
      v_rejected := v_rejected + 1;
      if jsonb_array_length(v_errors) < 10 then
        v_errors := v_errors || jsonb_build_object('id', v_ev ->> 'id', 'error', 'Faltan campos o tienen un formato inválido');
      end if;
    end;
  end loop;

  update public.crm_connections
  set last_event_at = case when v_accepted > 0 then now() else last_event_at end,
      events_received = events_received + v_accepted
  where workspace_id = v_conn.workspace_id;

  return jsonb_build_object('status', 'ok', 'accepted', v_accepted, 'duplicates', v_duplicates, 'rejected', v_rejected, 'errors', v_errors);
end $$;

revoke all on function public.ingest_crm_events(text, text, text) from public;
grant execute on function public.ingest_crm_events(text, text, text) to anon, authenticated;
