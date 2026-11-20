import type { Metadata } from "next";
import { Suspense } from "react";
import { openSharedCanvas } from "@/app/share-actions";
import { SharedCanvasViewer } from "@/components/canvas/canvas-editor";
import { PasswordGate } from "./password-gate";

export const metadata: Metadata = { title: "Mapa compartido", robots: { index: false, follow: false }, referrer: "no-referrer" };

export const instant = false;

export default function SharedPage({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense fallback={<Centered>Cargando el mapa…</Centered>}>
      <SharedContent params={params} />
    </Suspense>
  );
}

async function SharedContent({ params }: { params: PageProps<"/s/[token]">["params"] }) {
  const { token } = await params;
  const result = await openSharedCanvas(token);

  if (result.status === "ok") return <SharedCanvasViewer name={result.name} doc={result.doc} />;
  if (result.status === "password_required") return <PasswordGate token={token} />;
  if (result.status === "expired") {
    return <Centered title="Este link venció">Pide a DOUX.WORK un link nuevo para ver el mapa.</Centered>;
  }
  if (result.status === "not_found") {
    return <Centered title="No encontramos este mapa">El link no existe o fue desactivado. Revisa que esté completo o pide uno nuevo.</Centered>;
  }
  return <Centered title="No pudimos abrir el mapa">Intenta de nuevo en unos minutos.</Centered>;
}

function Centered({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card max-w-sm p-8 text-center">
        <p className="text-xs font-semibold tracking-widest text-muted">DOUX.WORK</p>
        {title && <h1 className="mt-2 text-lg font-semibold">{title}</h1>}
        <p className="mt-2 text-sm text-muted" role="status">{children}</p>
      </div>
    </main>
  );
}
