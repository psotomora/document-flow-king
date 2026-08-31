import { useState } from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatearFecha } from "@/lib/formato";
import {
  APP_FECHA_VERSION,
  APP_NOMBRE,
  APP_VERSION,
  HISTORIAL_VERSIONES,
} from "@/lib/version";

/** Control de versiones mostrado en la esquina inferior izquierda. */
export function VersionApp() {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-[11px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        title="Ver historial de versiones"
      >
        <History className="size-3.5 shrink-0" />
        <span className="font-mono">v{APP_VERSION}</span>
        <span className="truncate text-sidebar-foreground/50">
          {formatearFecha(APP_FECHA_VERSION)}
        </span>
      </button>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Control de versiones</DialogTitle>
            <DialogDescription>
              {APP_NOMBRE} · versión actual v{APP_VERSION} del {formatearFecha(APP_FECHA_VERSION)}
            </DialogDescription>
          </DialogHeader>
          <ol className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {HISTORIAL_VERSIONES.map((v) => (
              <li key={v.version} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-sm font-semibold">v{v.version}</p>
                  <p className="text-xs text-muted-foreground">{formatearFecha(v.fecha)}</p>
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                  {v.cambios.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
