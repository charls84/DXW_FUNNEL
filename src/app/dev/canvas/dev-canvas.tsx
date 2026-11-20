"use client";

import dynamic from "next/dynamic";

const DevEditor = dynamic(() => import("./dev-editor"), {
  ssr: false,
  loading: () => <p className="p-6 text-sm text-muted" role="status">Cargando el mapa de prueba…</p>,
});

export function DevCanvas() {
  return <DevEditor />;
}
