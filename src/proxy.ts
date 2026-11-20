import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/env";

// /s/: links de solo lectura para clientes (la validación ocurre en Postgres con get_shared_canvas).
// /api/crm/ingest/: webhook del CRM (autenticado por firma HMAC, no por sesión).
const PUBLIC_PATHS = ["/login", "/auth/callback", "/s/", "/api/crm/ingest/", ...(process.env.NODE_ENV === "production" ? [] : ["/dev/"])];

/**
 * Refresca la sesión de Supabase y redirige a /login si no hay usuario.
 * Es solo un chequeo optimista: la autorización real vive en lib/auth.ts y en RLS.
 */
export async function proxy(request: NextRequest) {
  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));
  const env = getSupabaseEnv();

  if (!env) {
    if (isPublic) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
