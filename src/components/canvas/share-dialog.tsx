"use client";

import { useEffect, useState } from "react";
import { Copy, X } from "lucide-react";

export type ShareLinkSummary = {
  id: string;
  token: string;
  hasPassword: boolean;
  showNotes: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
};

export type ShareActions = {
  list: () => Promise<ShareLinkSummary[]>;
  create: (opts: { password: string; expiresInDays: number | null; showNotes: boolean }) => Promise<{ ok: true; token: string } | { ok: false; error: string }>;
  revoke: (id: string) => Promise<{ ok: boolean }>;
};

const fmt = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" });

function statusOf(l: ShareLinkSummary): { label: string; active: boolean } {
  if (l.revokedAt) return { label: "Desactivado", active: false };
  if (l.expiresAt && new Date(l.expiresAt) < new Date()) return { label: "Vencido", active: false };
  return { label: l.expiresAt ? `Activo hasta ${fmt.format(new Date(l.expiresAt))}` : "Activo, sin vencimiento", active: true };
}

export function ShareDialog({ actions, onClose }: { actions: ShareActions; onClose: () => void }) {
  const [links, setLinks] = useState<ShareLinkSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [expires, setExpires] = useState("30");
  const [showNotes, setShowNotes] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const urlFor = (token: string) => `${window.location.origin}/s/${token}`;

  const load = () =>
    actions
      .list()
      .then((l) => {
        setLinks(l);
        setError(null);
      })
      .catch(() => setError("No pudimos cargar los links. Intenta de nuevo."));

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create() {
    if (password && password.length < 6) return setError("Usa una contraseña de al menos 6 caracteres, o déjala vacía.");
    setBusy("create");
    setError(null);
    const r = await actions.create({ password, expiresInDays: expires === "never" ? null : Number(expires), showNotes });
    setBusy(null);
    if (!r.ok) return setError(r.error);
    setCreated(urlFor(r.token));
    setPassword("");
    load();
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("No pudimos copiar el link. Selecciónalo y cópialo a mano.");
    }
  }

  async function revoke(id: string) {
    setBusy(id);
    const r = await actions.revoke(id);
    setBusy(null);
    setConfirmRevoke(null);
    if (r.ok) load();
    else setError("No pudimos desactivar el link. Intenta de nuevo.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="share-title" className="font-semibold">Compartir en solo lectura</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:bg-canvas" aria-label="Cerrar"><X size={18} /></button>
        </div>

        <div className="space-y-4 overflow-y-auto p-5">
          <p className="text-sm text-muted">
            Quien tenga el link puede ver el mapa sin cuenta. No puede editarlo. Úsalo para mostrar un embudo o proceso a un cliente.
          </p>

          <div className="space-y-3 rounded-md border border-line p-4">
            <div>
              <label htmlFor="share-password" className="field-label">Contraseña (opcional)</label>
              <input id="share-password" type="text" autoComplete="off" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="Déjala vacía para no pedir contraseña" />
              <p className="field-help">Compártela por un canal distinto al link.</p>
            </div>
            <div>
              <label htmlFor="share-expires" className="field-label">Vence</label>
              <select id="share-expires" value={expires} onChange={(e) => setExpires(e.target.value)} className="input">
                <option value="7">En 7 días</option>
                <option value="30">En 30 días</option>
                <option value="90">En 90 días</option>
                <option value="never">Nunca</option>
              </select>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={showNotes} onChange={(e) => setShowNotes(e.target.checked)} className="mt-1" />
              <span>
                Incluir notas y checklists
                <span className="block text-xs text-muted">Desactivado por defecto: suelen tener comentarios internos del equipo.</span>
              </span>
            </label>
            <button type="button" onClick={create} disabled={busy !== null} className="btn-primary w-full">
              {busy === "create" ? "Creando…" : "Crear link"}
            </button>
          </div>

          {created && (
            <div role="status" className="rounded-md border border-success/40 bg-success/10 p-3">
              <p className="text-sm font-medium">Link creado.</p>
              <div className="mt-2 flex gap-2">
                <input readOnly value={created} className="input font-mono text-xs" aria-label="Link creado" onFocus={(e) => e.target.select()} />
                <button type="button" onClick={() => copy(created, "new")} className="btn-secondary py-1.5 text-xs">
                  <Copy size={13} aria-hidden /> {copied === "new" ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <div>
            <h3 className="mb-2 text-sm font-semibold">Links de este mapa</h3>
            {links === null && !error && <p className="text-sm text-muted">Cargando links…</p>}
            {links?.length === 0 && <p className="text-sm text-muted">Todavía no hay links.</p>}
            <ul className="space-y-2">
              {links?.map((l) => {
                const s = statusOf(l);
                return (
                  <li key={l.id} className="rounded-md border border-line p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className={s.active ? "font-medium" : "text-muted"}>{s.label}</span>
                      <span className="text-xs text-muted">{l.viewCount} {l.viewCount === 1 ? "vista" : "vistas"}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Creado {fmt.format(new Date(l.createdAt))} · {l.hasPassword ? "Con contraseña" : "Sin contraseña"} · {l.showNotes ? "Con notas" : "Sin notas"}
                    </p>
                    {s.active && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        <button type="button" onClick={() => copy(urlFor(l.token), l.id)} className="text-accent hover:underline">
                          {copied === l.id ? "Copiado" : "Copiar link"}
                        </button>
                        {confirmRevoke === l.id ? (
                          <span className="flex items-center gap-2">
                            ¿Desactivar? Quien lo tenga dejará de ver el mapa.
                            <button type="button" onClick={() => revoke(l.id)} disabled={busy !== null} className="font-medium text-danger hover:underline">
                              {busy === l.id ? "Desactivando…" : "Desactivar"}
                            </button>
                            <button type="button" onClick={() => setConfirmRevoke(null)} className="text-muted hover:underline">Cancelar</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setConfirmRevoke(l.id)} className="text-danger hover:underline">Desactivar link</button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
