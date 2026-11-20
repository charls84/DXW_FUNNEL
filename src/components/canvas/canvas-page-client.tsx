"use client";

import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CanvasDoc } from "@/lib/canvas/types";
import { CanvasEditor, type CustomIcon, type EditorActions, type SaveResult } from "./canvas-editor";
import type { RevisionSummary } from "./versions-drawer";
import type { ShareLinkSummary } from "./share-dialog";
import type { UploadResult } from "./upload-button";

type ServerActions = {
  save: (doc: CanvasDoc, expectedVersion: number) => Promise<SaveResult>;
  rename: (name: string) => Promise<{ ok: boolean }>;
  listRevisions: () => Promise<RevisionSummary[]>;
  createRevision: (note: string) => Promise<{ ok: boolean }>;
  restoreRevision: (id: string) => Promise<{ ok: true; doc: CanvasDoc; version: number } | { ok: false }>;
  setTags: (tags: string[]) => Promise<{ ok: boolean }>;
  setTemplate: (v: boolean) => Promise<{ ok: boolean }>;
  listShareLinks: () => Promise<ShareLinkSummary[]>;
  createShareLink: (o: { password: string; expiresInDays: number | null; showNotes: boolean }) => Promise<{ ok: true; token: string } | { ok: false; error: string }>;
  revokeShareLink: (id: string) => Promise<{ ok: boolean }>;
  listIcons: () => Promise<CustomIcon[]>;
  addIcon: (name: string, url: string) => Promise<{ ok: true; icon: CustomIcon } | { ok: false }>;
  deleteIcon: (id: string) => Promise<{ ok: boolean }>;
};

type Props = {
  workspaceId: string;
  name: string;
  doc: CanvasDoc;
  version: number;
  readOnly: boolean;
  tags: string[];
  isTemplate: boolean;
  currency: string;
  supabase: { url: string; key: string };
  server: ServerActions;
};

const EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

/** Une las Server Actions con la subida directa de imágenes a Supabase Storage (bucket canvas-assets). */
export function CanvasPageClient({ workspaceId, name, doc, version, readOnly, tags, isTemplate, currency, supabase, server }: Props) {
  const actions = useMemo<EditorActions>(() => {
    const client = createClient(supabase.url, supabase.key);

    async function uploadImage(file: File): Promise<UploadResult> {
      const path = `${workspaceId}/${crypto.randomUUID()}.${EXT[file.type] ?? "png"}`;
      const { error } = await client.storage.from("canvas-assets").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (error) return { ok: false, error: "No pudimos subir la imagen. Revisa tu conexión e intenta de nuevo." };
      const { data } = client.storage.from("canvas-assets").getPublicUrl(path);
      return { ok: true, url: data.publicUrl };
    }

    return {
      save: server.save,
      rename: server.rename,
      listRevisions: server.listRevisions,
      createRevision: server.createRevision,
      restoreRevision: server.restoreRevision,
      uploadImage,
      icons: { list: server.listIcons, add: server.addIcon, remove: server.deleteIcon },
      share: { list: server.listShareLinks, create: server.createShareLink, revoke: server.revokeShareLink },
      details: { setTags: server.setTags, setTemplate: server.setTemplate },
    };
  }, [server, supabase.key, supabase.url, workspaceId]);

  return (
    <CanvasEditor
      name={name}
      initialDoc={doc}
      initialVersion={version}
      readOnly={readOnly}
      backHref={`/workspaces/${workspaceId}`}
      actions={actions}
      meta={{ tags, isTemplate }}
      currency={currency}
    />
  );
}
