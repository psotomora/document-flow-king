import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TarjetaIndicador({
  titulo,
  valor,
  detalle,
  icono,
  tono = "neutro",
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icono?: ReactNode;
  tono?: "neutro" | "exito" | "advertencia" | "peligro" | "primario";
}) {
  const tonos: Record<string, string> = {
    neutro: "text-foreground",
    exito: "text-exito",
    advertencia: "text-advertencia-foreground",
    peligro: "text-destructive",
    primario: "text-primary",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {titulo}
        </p>
        {icono ? <span className="text-muted-foreground">{icono}</span> : null}
      </div>
      <p className={cn("mt-2 font-mono text-xl font-semibold tabular-nums", tonos[tono])}>
        {valor}
      </p>
      {detalle ? <p className="mt-1 text-xs text-muted-foreground">{detalle}</p> : null}
    </div>
  );
}
