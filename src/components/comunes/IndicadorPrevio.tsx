import { History } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatearMoneda } from "@/lib/formato";
import type { MovimientoRegistrado } from "@/lib/movimientos-previos";
import type { Moneda } from "@/data/tipos";

export function IndicadorPrevio({ previos }: { previos: MovimientoRegistrado[] }) {
  if (!previos.length) return <span className="text-muted-foreground">—</span>;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="Movimiento previo registrado" className="inline-flex text-advertencia">
            <History className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm space-y-2">
          <p className="font-medium">
            {previos.length === 1 ? "Ya existe un movimiento registrado" : `Ya existen ${previos.length} movimientos registrados`}
          </p>
          {previos.map((p) => (
            <div key={p.id} className="text-xs">
              <div>Monto: {formatearMoneda(p.monto, p.moneda as Moneda)}</div>
              <div>Fecha: {p.fecha.slice(0, 10)}</div>
              <div>Descripción: {p.descripcion || "—"}</div>
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
