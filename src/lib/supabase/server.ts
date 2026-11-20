import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";

/** Cliente de Supabase para Server Components, Server Actions y Route Handlers. */
export async function createClient() {
  // Leer cookies primero marca la ruta como dinámica (no se pre-renderiza en el build).
  const cookieStore = await cookies();
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase no está configurado (revisa .env.local).");

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy refresca la sesión.
        }
      },
    },
  });
}
