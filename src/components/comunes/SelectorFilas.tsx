import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OPCIONES_FILAS } from "@/lib/preferencias";

interface Props {
  id?: string;
  filas: number;
  onCambio: (valor: number) => void;
  etiqueta?: string;
}

/** Selector reutilizable con la cantidad de filas visibles de una tabla. */
export function SelectorFilas({ id = "filas", filas, onCambio, etiqueta = "Filas visibles" }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={id} className="text-xs whitespace-nowrap text-muted-foreground">
        {etiqueta}
      </Label>
      <Select value={String(filas)} onValueChange={(v) => onCambio(Number(v))}>
        <SelectTrigger id={id} className="h-8 w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPCIONES_FILAS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
