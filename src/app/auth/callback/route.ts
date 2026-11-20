import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllowedDomain } from "@/lib/env";
import { isAllowedEmail } from "@/lib/domain";

/** Destino del OAuth de Google: crea la sesión y rechaza correos fuera del dominio DXW. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!code) return to("/login?error=auth");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return to("/login?error=auth");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAllowedEmail(user?.email, getAllowedDomain())) {
    await supabase.auth.signOut();
    return to("/login?error=dominio");
  }

  return to("/workspaces");
}
