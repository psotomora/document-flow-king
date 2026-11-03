import { Users } from "lucide-react";
import { nivelCupo, porcentajeCupo, useSesionSaas } from "@/lib/empresas";
import { cn } from "@/lib/utils";

/** Indicador «Licencias: X de Y usuarios utilizados» para el administrador de la empresa. */
export function CupoUsuarios() {
  const sesion = useSesionSaas();
  if (!sesion?.disponible || sesion.maxUsuarios == null) return null;
  const activos = sesion.usuariosActivos ?? 0;
  const max = sesion.maxUsuarios;
  const lleno = nivelCupo(activos, max) === "lleno";
  return (
    <div
      className={cn(
        "flex min-w-56 items-center gap-3 rounded-lg border px-3 py-2 text-sm",
        lleno ? "border-warning/60 bg-warning/10" : "border-border bg-card",
      )}
    >
      <Users className={cn("size-4 shrink-0", lleno ? "text-warning" : "text-muted-foreground")} />
      <div className="flex-1">
        <div>
          Licencias: <strong>{activos}</strong> de <strong>{max}</strong> usuarios utilizados
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-muted">
          <div
            className={cn("h-1.5 rounded-full", lleno ? "bg-warning" : "bg-primary")}
            style={{ width: `${porcentajeCupo(activos, max)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
