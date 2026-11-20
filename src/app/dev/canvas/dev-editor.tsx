"use client";

import { useState } from "react";
import { CanvasEditor, type CustomIcon, type EditorActions } from "@/components/canvas/canvas-editor";
import { buildTemplate } from "@/lib/canvas/templates";
import { sanitizeDoc } from "@/lib/canvas/doc";
import type { CanvasDoc } from "@/lib/canvas/types";
import type { RevisionSummary } from "@/components/canvas/versions-drawer";
import type { ShareLinkSummary } from "@/components/canvas/share-dialog";

export const KEY = "dxw-dev-canvas";
const REV_KEY = "dxw-dev-canvas-revisions";
const ICON_KEY = "dxw-dev-canvas-icons";
const SHARE_KEY = "dxw-dev-canvas-shares";

type Stored = { doc: CanvasDoc; version: number };
type StoredRev = RevisionSummary & { doc: CanvasDoc };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin almacenamiento: la prueba sigue en memoria */
  }
}

/** Se carga solo en el navegador (ssr: false), así que puede leer localStorage al iniciar. */
export default function DevEditor() {
  const [initial] = useState<Stored>(() => {
    const s = read<Stored | null>(KEY, null);
    return s ? { doc: sanitizeDoc(s.doc), version: s.version } : { doc: buildTemplate("dxw-sales-process"), version: 1 };
  });

  const actions: EditorActions = {
    async save(doc, expected) {
      const cur = read<Stored | null>(KEY, null);
      if (cur && cur.version !== expected) return { ok: false, reason: "conflict" };
      const next = { doc: sanitizeDoc(doc), version: expected + 1 };
      write(KEY, next);
      return { ok: true, version: next.version };
    },
    async rename() {
      return { ok: true };
    },
    async listRevisions() {
      return read<StoredRev[]>(REV_KEY, []).map((r) => ({ id: r.id, note: r.note, isAuto: r.isAuto, createdAt: r.createdAt, author: r.author }));
    },
    async createRevision(note) {
      const cur = read<Stored>(KEY, initial);
      const revs = read<StoredRev[]>(REV_KEY, []);
      revs.unshift({ id: crypto.randomUUID(), note: note || null, isAuto: false, createdAt: new Date().toISOString(), author: "Prueba local", doc: cur.doc });
      write(REV_KEY, revs);
      return { ok: true };
    },
    async restoreRevision(id) {
      const rev = read<StoredRev[]>(REV_KEY, []).find((r) => r.id === id);
      if (!rev) return { ok: false };
      const cur = read<Stored>(KEY, initial);
      const next = { doc: rev.doc, version: cur.version + 1 };
      write(KEY, next);
      return { ok: true, doc: next.doc, version: next.version };
    },
    // En producción las imágenes van a Supabase Storage; aquí se guardan como data URL pequeñas.
    async uploadImage(file) {
      if (file.size > 280_000) return { ok: false, error: "En la vista de prueba usa imágenes de menos de 280 KB." };
      const url = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      return { ok: true, url };
    },
    icons: {
      async list() {
        return read<CustomIcon[]>(ICON_KEY, []);
      },
      async add(name, url) {
        const icon = { id: crypto.randomUUID(), name, url };
        write(ICON_KEY, [icon, ...read<CustomIcon[]>(ICON_KEY, [])]);
        return { ok: true, icon };
      },
      async remove(id) {
        write(ICON_KEY, read<CustomIcon[]>(ICON_KEY, []).filter((i) => i.id !== id));
        return { ok: true };
      },
    },
    details: {
      async setTags() {
        return { ok: true };
      },
      async setTemplate() {
        return { ok: true };
      },
    },
    share: {
      async list() {
        return read<ShareLinkSummary[]>(SHARE_KEY, []);
      },
      async create(o) {
        const link: ShareLinkSummary = {
          id: crypto.randomUUID(),
          token: "prueba-local-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16),
          hasPassword: !!o.password,
          showNotes: o.showNotes,
          expiresAt: o.expiresInDays ? new Date(Date.now() + o.expiresInDays * 86_400_000).toISOString() : null,
          revokedAt: null,
          viewCount: 0,
          lastViewedAt: null,
          createdAt: new Date().toISOString(),
        };
        write(SHARE_KEY, [link, ...read<ShareLinkSummary[]>(SHARE_KEY, [])]);
        return { ok: true, token: link.token };
      },
      async revoke(id) {
        write(SHARE_KEY, read<ShareLinkSummary[]>(SHARE_KEY, []).map((l) => (l.id === id ? { ...l, revokedAt: new Date().toISOString() } : l)));
        return { ok: true };
      },
    },
  };

  return (
    <CanvasEditor
      name="Prueba local · Proceso comercial DXW"
      initialDoc={initial.doc}
      initialVersion={initial.version}
      readOnly={false}
      backHref="/dev/shared"
      actions={actions}
      meta={{ tags: ["prueba"], isTemplate: false }}
    />
  );
}
