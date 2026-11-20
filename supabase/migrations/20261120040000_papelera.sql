-- DXW Funnel · Papelera de mapas: borrado suave con restauración.
-- Los mapas eliminados se conservan 30 días (la limpieza definitiva se hace desde la app o con un cron).

alter table public.canvases add column deleted_at timestamptz;
create index canvases_deleted_idx on public.canvases (workspace_id, deleted_at) where deleted_at is not null;

-- Un link compartido de un mapa en la papelera deja de abrir.
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

  select * into v_canvas from public.canvases where id = v_link.canvas_id and deleted_at is null;
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

-- Limpieza: borra definitivamente lo que lleva más de 30 días en la papelera. Llamar desde un cron o a mano.
create or replace function public.purge_old_canvases() returns integer
language sql security definer set search_path = public as $$
  with gone as (delete from public.canvases where deleted_at < now() - interval '30 days' returning 1)
  select count(*)::integer from gone
$$;
revoke all on function public.purge_old_canvases() from public, anon, authenticated;
