"use client";

import { useRef, useState } from "react";

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };
export type UploadImage = (file: File) => Promise<UploadResult>;

export function validateImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Usa una imagen PNG, JPG, SVG, WEBP o GIF.";
  if (file.size > MAX_IMAGE_BYTES) return "La imagen pesa más de 5 MB. Usa una más liviana.";
  return null;
}

/** Botón que abre el selector de archivos, valida y sube la imagen. */
export function UploadButton({
  upload,
  onUploaded,
  label,
  className = "btn-secondary py-1.5 text-xs",
}: {
  upload: UploadImage;
  onUploaded: (url: string, file: File) => void;
  label: string;
  className?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const invalid = validateImage(file);
    if (invalid) return setError(invalid);
    setBusy(true);
    setError(null);
    const r = await upload(file);
    setBusy(false);
    if (r.ok) onUploaded(r.url, file);
    else setError(r.error);
  }

  return (
    <div>
      <input ref={input} type="file" accept={IMAGE_TYPES.join(",")} className="hidden" onChange={onChange} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={className}>
        {busy ? "Subiendo…" : label}
      </button>
      {error && <p role="alert" className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
