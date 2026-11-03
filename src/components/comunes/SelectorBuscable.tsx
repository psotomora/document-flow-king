import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface OpcionBuscable {
  valor: string;
  etiqueta: string;
  /** Texto adicional por el que se puede buscar (identificación, proveedor, etc.). */
  busqueda?: string;
  destacada?: boolean;
}

interface Props {
  opciones: OpcionBuscable[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
  buscarPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  ampliarAlContenido?: boolean;
}

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Selector con caja de búsqueda: filtra por la etiqueta y el texto de búsqueda
 * de cada opción (número de documento, identificación, nombre, etc.).
 */
export function SelectorBuscable({
  opciones,
  valor,
  onChange,
  placeholder = "Seleccionar",
  buscarPlaceholder = "Buscar...",
  disabled,
  className,
  ampliarAlContenido = false,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");

  const seleccionada = opciones.find((o) => o.valor === valor);
  const filtradas = useMemo(() => {
    const t = normalizar(texto.trim());
    if (!t) return opciones;
    return opciones.filter(
      (o) => normalizar(o.etiqueta).includes(t) || (o.busqueda && normalizar(o.busqueda).includes(t)),
    );
  }, [opciones, texto]);

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          disabled={disabled}
          className={cn("h-8 w-full justify-between font-normal", !seleccionada && "text-muted-foreground", className)}
        >
          <span className="truncate">{seleccionada ? seleccionada.etiqueta : placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent collisionPadding={12} className={cn("min-w-56 p-0", ampliarAlContenido ? "w-max min-w-[min(var(--radix-popover-trigger-width),calc(100vw-24px))] max-w-[calc(100vw-24px)]" : "w-[var(--radix-popover-trigger-width)]")} align="start">
        <Command shouldFilter={false} className={ampliarAlContenido ? "w-auto" : undefined}>
          <CommandInput placeholder={buscarPlaceholder} value={texto} onValueChange={setTexto} />
          <CommandList className={ampliarAlContenido ? "max-h-[min(300px,var(--radix-popover-content-available-height))]" : undefined}>
            <CommandEmpty>Sin resultados.</CommandEmpty>
            <CommandGroup>
              {filtradas.map((o) => (
                <CommandItem
                  key={o.valor}
                  value={o.valor}
                  onSelect={() => {
                    onChange(o.valor);
                    setAbierto(false);
                    setTexto("");
                  }}
                >
                  <Check className={cn("mr-2 size-4 shrink-0", o.valor === valor ? "opacity-100" : "opacity-0")} />
                  <span className={ampliarAlContenido ? "min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]" : "truncate"}>
                    {o.destacada ? "★ " : ""}
                    {o.etiqueta}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
