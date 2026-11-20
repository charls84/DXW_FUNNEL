import { Suspense } from "react";

// El editor depende de la sesión: se renderiza por request detrás de un Suspense.
export const instant = false;

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-muted" role="status">
          Cargando el mapa…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
