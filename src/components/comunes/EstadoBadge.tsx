import { cn } from "@/lib/utils";
import type { EstadoFactura } from "@/data/tipos";

const clases: Record<EstadoFactura, string> = {
  Pagada: "bg-exito-suave text-exito border-exito/30",
  Pendiente: "bg-advertencia-suave text-advertencia-foreground border-advertencia/40",
  Vencida: "bg-destructive-suave text-destructive border-destructive/30",
};

const punto: Record<EstadoFactura, string> = {
  Pagada: "bg-exito",
  Pendiente: "bg-advertencia",
  Vencida: "bg-destructive",
};

/** RF-014: color + texto, para no depender de la percepción del color. */
export function EstadoBadge({ estado }: { estado: EstadoFactura }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        clases[estado],
      )}
    >
      <span className={cn("size-1.5 rounded-full", punto[estado])} aria-hidden />
      {estado}
    </span>
  );
}
