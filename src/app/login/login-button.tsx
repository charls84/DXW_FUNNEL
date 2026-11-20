"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginButton({ url, anonKey, domain }: { url: string; anonKey: string; domain: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const supabase = createClient(url, anonKey);
    await supabase.auth.signOut({ scope: "local" });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { hd: domain, prompt: "select_account" },
      },
    });
    if (error) {
      setPending(false);
      setError("No pudimos abrir el inicio de sesión de Google. Intenta de nuevo.");
    }
  }

  return (
    <>
      <button type="button" onClick={signIn} disabled={pending} className="btn-primary w-full">
        {pending ? "Abriendo Google…" : "Entrar con Google"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
