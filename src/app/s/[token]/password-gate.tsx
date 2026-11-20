"use client";

import { useState } from "react";
import { openSharedCanvas, type SharedResult } from "@/app/share-actions";
import { SharedCanvasViewer } from "@/components/canvas/canvas-editor";

const MESSAGES: Partial<Record<SharedResult["status"], string>> = {
  wrong_password: "La contraseña no coincide. Revísala e intenta de nuevo.",
  expired: "Este link venció. Pide a DOUX.WORK un link nuevo.",
  not_found: "Este link ya no está activo. Pide uno nuevo.",
  error: "No pudimos abrir el mapa. Intenta de nuevo.",
};

export function PasswordGate({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<Extract<SharedResult, { status: "ok" }> | null>(null);

  if (opened) return <SharedCanvasViewer name={opened.name} doc={opened.doc} />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return setError("Escribe la contraseña que te compartieron.");
    setPending(true);
    setError(null);
    const r = await openSharedCanvas(token, password);
    setPending(false);
    if (r.status === "ok") setOpened(r);
    else setError(MESSAGES[r.status] ?? MESSAGES.error!);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted">DOUX.WORK</p>
          <h1 className="mt-1 text-lg font-semibold">Este mapa está protegido</h1>
          <p className="mt-1 text-sm text-muted">Escribe la contraseña que te compartieron para verlo.</p>
        </div>
        <div>
          <label htmlFor="share-pwd" className="field-label">Contraseña</label>
          <input id="share-pwd" type="password" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} className="input" autoFocus />
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Verificando…" : "Ver mapa"}
        </button>
      </form>
    </main>
  );
}
