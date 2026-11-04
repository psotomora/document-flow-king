import { AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatearMoneda } from "@/lib/formato";
import type { RegistroConReferencia } from "@/lib/referencias-en-uso";
import type { Moneda } from "@/data/tipos";

export function IndicadorReferenciaEnUso({ registros }: { registros: RegistroConReferencia[] }) {
  if (!registros.length) return null;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Referencia ya registrada"
            className="ml-1 inline-flex items-center gap-1 rounded bg-advertencia-suave px-1.5 py-0.5 text-xs font-medium text-advertencia"
          >
            <AlertTriangle className="h-3 w-3" /> Ref. en uso
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm space-y-2">
          <p className="font-medium">Esta referencia ya está registrada</p>
          {registros.map((r) => (
            <div key={r.id} className="text-xs">
              <div>Monto: {formatearMoneda(r.monto, r.moneda as Moneda)}</div>
              <div>Fecha: {r.fecha.slice(0, 10)}</div>
              <div>Descripción: {r.descripcion || "—"}</div>
            </div>
          ))}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
