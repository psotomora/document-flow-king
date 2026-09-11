import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import { avisoLicencia, estadoLicencia, licenciaDisponible } from "@/lib/licencia";

/** Franja de aviso cuando la licencia está por vencer, en gracia o bloqueada. */
export function AvisoLicencia() {
  const [aviso, setAviso] = useState<string | null>(null);
  const [critico, setCritico] = useState(false);

  useEffect(() => {
    if (!licenciaDisponible()) return;
    let vigente = true;
    void (async () => {
      try {
        const estado = await estadoLicencia();
        if (!vigente) return;
        setAviso(avisoLicencia(estado));
        setCritico(estado.estado === "bloqueada" || estado.estado === "ausente");
      } catch {
        // Un fallo al consultar la licencia no debe interrumpir la pantalla.
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  if (!aviso) return null;

  return (
    <div
      role="status"
      className={`rounded-lg border px-4 py-3 text-sm ${
        critico
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
    >
      {aviso}{" "}
      <Link to="/parametros" className="font-medium underline underline-offset-2">
        Ir a Parámetros
      </Link>
    </div>
  );
}
