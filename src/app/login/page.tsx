import type { Metadata } from "next";
import { Suspense } from "react";
import { getAllowedDomain, getSupabaseEnv } from "@/lib/env";
import { LoginButton } from "./login-button";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  dominio: "Esa cuenta no es de @{domain}. Entra con tu cuenta de DOUX.WORK.",
  "sin-acceso": "Tu cuenta todavía no tiene acceso a DXW Funnel. Pide a un administrador que lo revise.",
  auth: "No pudimos completar el inicio de sesión. Intenta de nuevo.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <p className="text-xs font-semibold tracking-widest text-muted">DOUX.WORK</p>
        <h1 className="mt-1 text-2xl font-semibold">DXW Funnel</h1>
        <p className="mt-2 text-sm text-muted">Mapea y simula los procesos y embudos de DXW y sus clientes.</p>
        <Suspense fallback={<div className="mt-6 h-10" />}>
          <LoginPanel searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginPanel({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const env = getSupabaseEnv();
  const domain = getAllowedDomain();
  const errorKey = typeof params.error === "string" ? params.error : null;
  const error = errorKey ? ERRORS[errorKey]?.replace("{domain}", domain) : null;

  if (!env) {
    return (
      <p role="alert" className="mt-6 rounded-md border border-line bg-canvas p-3 text-sm">
        Falta conectar Supabase. Completa <code className="font-mono">.env.local</code> siguiendo{" "}
        <code className="font-mono">docs/04-setup-fase-0.md</code>.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}
      <LoginButton url={env.url} anonKey={env.key} domain={domain} />
      <p className="field-help">Usa tu cuenta de Google de @{domain}.</p>
    </div>
  );
}
