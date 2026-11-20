import "server-only";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceType = "internal" | "client";

export type Workspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  main_url: string | null;
  timezone: string;
  currency: string;
  updated_at: string;
};

export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  internal: "Interno DXW",
  client: "Cliente",
};

export const CURRENCIES = ["USD", "COP", "MXN", "EUR"] as const;

const COLUMNS = "id, name, type, main_url, timezone, currency, updated_at";

/** RLS limita los resultados a miembros del equipo. Llamar después de getCurrentMember(). */
export async function listWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspaces").select(COLUMNS).order("name");
  if (error) throw new Error(`No se pudieron cargar los workspaces: ${error.message}`);
  return (data ?? []) as Workspace[];
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("workspaces").select(COLUMNS).eq("id", id).maybeSingle();
  return (data as Workspace | null) ?? null;
}
