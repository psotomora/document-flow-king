import { useEffect, useState } from "react";

import { formatearFecha } from "@/lib/formato";
import { estadoLicencia, licenciaDisponible, type EstadoLicencia } from "@/lib/licencia";

const ETIQUETAS: Record<string, { texto: string; clase: string }> = {
  vigente: { texto: "Vigente", clase: "text-emerald-500" },
  porVencer: { texto: "Por vencer", clase: "text-amber-500" },
  gracia: { texto: "En gracia", clase: "text-orange-500" },
  bloqueada: { texto: "Bloqueada", clase: "text-destructive" },
  ausente: { texto: "Sin licencia", clase: "text-destructive" },
  libre: { texto: "Sin control", clase: "text-sidebar-foreground/70" },
};

/** Resumen de la licencia mostrado en el panel lateral, sobre los datos del usuario. */
export function ResumenLicencia() {
  const [estado, setEstado] = useState<EstadoLicencia | null>(null);

  useEffect(() => {
    if (!licenciaDisponible()) return;
    let activo = true;
    estadoLicencia()
      .then((e) => {
        if (activo) setEstado(e);
      })
      .catch(() => {
        /* Sin licencia disponible: no se muestra la sección. */
      });
    return () => {
      activo = false;
    };
  }, []);

  if (!estado) return null;

  const etiqueta = ETIQUETAS[estado.estado] ?? {
    texto: estado.estado,
    clase: "text-sidebar-foreground/70",
  };
  const vence = estado.vence ? formatearFecha(new Date(estado.vence)) : "—";

  return (
    <div className="space-y-1 border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/60">
      <p className="text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
        Licencia
      </p>
      <p className="truncate">{estado.clienteNombre || estado.producto || "—"}</p>
      <p>
        Estado: <span className={etiqueta.clase}>{etiqueta.texto}</span>
      </p>
      <p>Vencimiento: {vence}</p>
    </div>
  );
}
