"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CrmConnection } from "@/app/crm-actions";

type Props = {
  connection: CrmConnection | null;
  create: () => Promise<{ ok: boolean; error?: string }>;
  rotate: () => Promise<{ ok: boolean }>;
  remove: () => Promise<{ ok: boolean }>;
};

const EXAMPLE = `{
  "events": [
    {
      "id": "evt_10234",
      "type": "stage_changed",
      "occurred_at": "2026-11-20T15:04:05Z",
      "contact": { "id": "c_881", "email": "ana@cliente.com", "source": "LinkedIn" },
      "pipeline": "Ventas",
      "stage": "Diagnóstico",
      "owner": "Comercial"
    },
    {
      "id": "evt_10240",
      "type": "deal_won",
      "occurred_at": "2026-11-28T18:30:00Z",
      "contact": { "id": "c_881" },
      "pipeline": "Ventas",
      "value": 4000,
      "currency": "USD"
    }
  ]
}`;

const NODE_SNIPPET = `import crypto from "node:crypto";

const body = JSON.stringify({ events });
const signature = "sha256=" + crypto
  .createHmac("sha256", process.env.DXW_FUNNEL_SECRET)
  .update(body)
  .digest("hex");

await fetch(process.env.DXW_FUNNEL_WEBHOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-DXW-Signature": signature },
  body, // firma y envía exactamente el mismo texto
});`;

export function ConnectionPanel({ connection, create, rotate, remove }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"rotate" | "remove" | null>(null);
  // El origen solo existe en el navegador; en el servidor se deja vacío para no romper la hidratación.
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");
  const url = connection && origin ? `${origin}/api/crm/ingest/${connection.ingestKey}` : "";

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("No pudimos copiar. Selecciona el texto y cópialo a mano.");
    }
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, failMsg: string) =>
    start(async () => {
      setError(null);
      const r = await fn();
      setConfirm(null);
      if (!r.ok) setError(r.error ?? failMsg);
      router.refresh();
    });

  if (!connection) {
    return (
      <div className="mt-4">
        <button type="button" disabled={pending} onClick={() => run(create, "No pudimos crear la conexión. Intenta de nuevo.")} className="btn-primary">
          {pending ? "Creando…" : "Crear conexión del CRM"}
        </button>
        <p className="field-help">Genera una URL de webhook y un secreto para firmar los envíos.</p>
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      <div>
        <span className="field-label">URL del webhook</span>
        <div className="flex gap-2">
          <input readOnly value={url} className="input font-mono text-xs" aria-label="URL del webhook" onFocus={(e) => e.target.select()} />
          <button type="button" onClick={() => copy(url, "url")} className="btn-secondary py-1.5 text-xs">{copied === "url" ? "Copiado" : "Copiar"}</button>
        </div>
      </div>
      <div>
        <span className="field-label">Secreto para firmar</span>
        <div className="flex gap-2">
          <input readOnly value={showSecret ? connection.secret : "•".repeat(32)} className="input font-mono text-xs" aria-label="Secreto" />
          <button type="button" onClick={() => setShowSecret((v) => !v)} className="btn-secondary py-1.5 text-xs">{showSecret ? "Ocultar" : "Mostrar"}</button>
          <button type="button" onClick={() => copy(connection.secret, "secret")} className="btn-secondary py-1.5 text-xs">{copied === "secret" ? "Copiado" : "Copiar"}</button>
        </div>
        <p className="field-help">Guárdalo como variable de entorno en el CRM (por ejemplo DXW_FUNNEL_SECRET). No lo compartas por chat ni correo.</p>
      </div>

      <details className="rounded-md border border-line p-3 text-sm">
        <summary className="cursor-pointer font-medium">Cómo enviar eventos desde el CRM</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>Haz un POST a la URL con el cuerpo en JSON (uno o varios eventos, máximo 500 por envío).</li>
          <li>Firma el cuerpo exacto con HMAC-SHA256 y el secreto, y envíalo en el header <code className="font-mono">X-DXW-Signature: sha256=&lt;hex&gt;</code>.</li>
          <li>Usa un <code className="font-mono">id</code> único por evento: si se reenvía, no se duplica.</li>
        </ol>
        <p className="mt-3 text-xs font-medium">Ejemplo de cuerpo</p>
        <pre className="mt-1 overflow-x-auto rounded bg-canvas p-2 font-mono text-[11px]">{EXAMPLE}</pre>
        <p className="mt-3 text-xs font-medium">Ejemplo en Node.js</p>
        <pre className="mt-1 overflow-x-auto rounded bg-canvas p-2 font-mono text-[11px]">{NODE_SNIPPET}</pre>
        <p className="mt-2 text-xs text-muted">Respuestas: 200 con accepted, duplicates y rejected · 401 firma inválida · 404 clave inválida · 413 demasiados eventos.</p>
      </details>

      <div className="flex flex-wrap gap-3 border-t border-line pt-4 text-sm">
        {confirm === "rotate" ? (
          <span className="flex flex-wrap items-center gap-2">
            ¿Generar un secreto nuevo? El CRM dejará de poder enviar eventos hasta que actualices el secreto allá.
            <button type="button" disabled={pending} onClick={() => run(rotate, "No pudimos rotar el secreto.")} className="btn-primary py-1 text-xs">Generar secreto nuevo</button>
            <button type="button" onClick={() => setConfirm(null)} className="btn-secondary py-1 text-xs">Cancelar</button>
          </span>
        ) : confirm === "remove" ? (
          <span className="flex flex-wrap items-center gap-2">
            ¿Desconectar? El webhook dejará de aceptar eventos. Los eventos ya guardados se mantienen.
            <button type="button" disabled={pending} onClick={() => run(remove, "No pudimos desconectar.")} className="btn-danger py-1 text-xs">Desconectar</button>
            <button type="button" onClick={() => setConfirm(null)} className="btn-secondary py-1 text-xs">Cancelar</button>
          </span>
        ) : (
          <>
            <button type="button" onClick={() => setConfirm("rotate")} className="text-accent hover:underline">Rotar secreto</button>
            <button type="button" onClick={() => setConfirm("remove")} className="text-danger hover:underline">Desconectar</button>
          </>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
