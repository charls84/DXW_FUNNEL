import { notFound } from "next/navigation";
import { DevShared } from "./dev-shared";

/** Vista pública de prueba (solo desarrollo): muestra el mapa de /dev/canvas como lo vería un cliente. */
export default function DevSharedPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevShared />;
}
