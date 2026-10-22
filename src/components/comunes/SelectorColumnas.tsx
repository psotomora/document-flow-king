import { ArrowDown, ArrowUp, Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { permutacionColumnas, type ConfigColumnas } from "@/lib/columnas";

export function SelectorColumnas({
  etiquetas,
  config,
  onCambio,
}: {
  etiquetas: string[];
  config: ConfigColumnas | null;
  onCambio: (c: ConfigColumnas | null) => void;
}) {
  const ocultas = config?.ocultas ?? [];
  const orden = permutacionColumnas(etiquetas, { orden: config?.orden ?? [], ocultas: [] }).map((i) => etiquetas[i] ?? "");
  const mover = (i: number, d: number) => {
    const n = [...orden];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    const t = n[i]!; n[i] = n[j]!; n[j] = t;
    onCambio({ orden: n, ocultas });
  };
  const alternar = (e: string, visible: boolean) => {
    const nuevas = visible ? ocultas.filter((o) => o !== e) : [...ocultas, e];
    if (nuevas.length >= etiquetas.length) return;
    onCambio({ orden, ocultas: nuevas });
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
          <Columns3 className="size-3.5" /> Columnas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="px-1 pb-2 text-xs text-muted-foreground">Columnas visibles y orden</p>
        <ul className="max-h-80 space-y-0.5 overflow-auto">
          {orden.map((e, i) => (
            <li key={e} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
              <Checkbox
                id={`col-${i}-${e}`}
                checked={!ocultas.includes(e)}
                onCheckedChange={(v) => alternar(e, v === true)}
              />
              <label htmlFor={`col-${i}-${e}`} className="flex-1 truncate text-sm">{e}</label>
              <Button variant="ghost" size="icon" className="size-6" aria-label={`Subir ${e}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-6" aria-label={`Bajar ${e}`} disabled={i === orden.length - 1} onClick={() => mover(i, 1)}>
                <ArrowDown className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => onCambio(null)}>
          Restablecer
        </Button>
      </PopoverContent>
    </Popover>
  );
}
