"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/auth";
import { canDeleteWorkspaces, canEditWorkspaces, canManageMembers, isRole } from "@/lib/permissions";
import { parseWorkspaceForm } from "@/lib/validation";

export type FormState = { error?: string; success?: string } | null;

const NO_PERMISSION = "Tu rol no permite hacer este cambio. Pide ayuda a un administrador.";

export async function createWorkspace(_prev: FormState, form: FormData): Promise<FormState> {
  const member = await getCurrentMember();
  if (!canEditWorkspaces(member.role)) return { error: NO_PERMISSION };

  const parsed = parseWorkspaceForm(form);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("id").limit(1).single();
  if (!org) return { error: "No encontramos la organización DXW. Revisa la configuración de la base de datos." };

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ ...parsed.value, organization_id: org.id, created_by: member.userId })
    .select("id")
    .single();

  if (error || !data) return { error: "No pudimos crear el workspace. Intenta de nuevo." };

  revalidatePath("/", "layout");
  redirect(`/workspaces/${data.id}`);
}

export async function updateWorkspace(workspaceId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const member = await getCurrentMember();
  if (!canEditWorkspaces(member.role)) return { error: NO_PERMISSION };

  const parsed = parseWorkspaceForm(form);
  if (!parsed.ok) return { error: parsed.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .update(parsed.value)
    .eq("id", workspaceId)
    .select("id");

  if (error || !data?.length) return { error: "No pudimos guardar los cambios. Intenta de nuevo." };

  revalidatePath("/", "layout");
  return { success: "Cambios guardados." };
}

export async function deleteWorkspace(workspaceId: string, _prev: FormState, form: FormData): Promise<FormState> {
  const member = await getCurrentMember();
  if (!canDeleteWorkspaces(member.role)) return { error: NO_PERMISSION };

  const supabase = await createClient();
  const { data: ws } = await supabase.from("workspaces").select("name").eq("id", workspaceId).maybeSingle();
  if (!ws) return { error: "Este workspace ya no existe." };

  if (String(form.get("confirm_name") ?? "").trim() !== ws.name) {
    return { error: `Escribe "${ws.name}" exactamente para confirmar.` };
  }

  const { data, error } = await supabase.from("workspaces").delete().eq("id", workspaceId).select("id");
  if (error || !data?.length) return { error: "No pudimos eliminar el workspace. Intenta de nuevo." };

  revalidatePath("/", "layout");
  redirect("/workspaces");
}

export async function updateMemberRole(_prev: FormState, form: FormData): Promise<FormState> {
  const member = await getCurrentMember();
  if (!canManageMembers(member.role)) return { error: NO_PERMISSION };

  const userId = String(form.get("user_id") ?? "");
  const role = form.get("role");
  if (!userId || !isRole(role)) return { error: "Elige un rol de la lista." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("members").update({ role }).eq("user_id", userId).select("user_id");

  if (error?.message?.includes("DXW_LAST_ADMIN")) {
    return { error: "Debe quedar al menos un administrador. Asigna otro antes de cambiar este rol." };
  }
  if (error || !data?.length) return { error: "No pudimos cambiar el rol. Intenta de nuevo." };

  revalidatePath("/equipo");
  return { success: "Rol actualizado." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
