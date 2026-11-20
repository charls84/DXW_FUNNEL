import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAllowedDomain } from "@/lib/env";
import { isAllowedEmail } from "@/lib/domain";
import { isRole, type Role } from "@/lib/permissions";

export type Member = {
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: Role;
};

/**
 * Capa de acceso a datos: devuelve el miembro actual o redirige a /login.
 * Llamar en cada Server Component, Server Action y Route Handler que lea o cambie datos.
 */
export async function getCurrentMember(): Promise<Member> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAllowedEmail(user.email, getAllowedDomain())) redirect("/login?error=dominio");

  const { data } = await supabase
    .from("members")
    .select("user_id, email, full_name, avatar_url, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data || !isRole(data.role)) redirect("/login?error=sin-acceso");

  return {
    userId: data.user_id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    role: data.role,
  };
}
