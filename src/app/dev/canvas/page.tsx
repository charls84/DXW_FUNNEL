import { notFound } from "next/navigation";
import { DevCanvas } from "./dev-canvas";

/**
 * Vista de prueba del editor SIN base de datos (solo en desarrollo).
 * Guarda en el navegador (localStorage). En producción responde 404.
 */
export default function DevCanvasPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevCanvas />;
}
