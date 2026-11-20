"use client";

import dynamic from "next/dynamic";

const Viewer = dynamic(() => import("./dev-shared-viewer"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted" role="status">Cargando la vista compartida de prueba…</p>,
});

export function DevShared() {
  return <Viewer />;
}
