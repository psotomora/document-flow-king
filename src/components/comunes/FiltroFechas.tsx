import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIODOS_FECHA, periodoValido, type PeriodoFecha } from "@/lib/filtros-fecha";
import { formatearFecha } from "@/lib/formato";

function FechaFiltro({ id, etiqueta, valor, onCambio }: { id: string; etiqueta: string; valor: string; onCambio: (valor: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="flex items-center gap-1">
        <Popover open={abierto} onOpenChange={setAbierto}>
          <PopoverTrigger asChild>
            <Button id={id} variant="outline" className="w-44 max-w-full justify-start font-normal">
              <CalendarIcon className="size-4 shrink-0" />
              <span className={valor ? "" : "text-muted-foreground"}>{valor ? formatearFecha(valor) : "Elegir fecha"}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-0">
            <Calendar mode="single" locale={es} selected={valor ? parseISO(valor) : undefined} defaultMonth={valor ? parseISO(valor) : undefined} captionLayout="dropdown" startMonth={new Date(1990, 0)} endMonth={new Date(2100, 11)} className="pointer-events-auto" onSelect={(fecha) => { onCambio(fecha ? format(fecha, "yyyy-MM-dd") : ""); setAbierto(false); }} />
          </PopoverContent>
        </Popover>
        {valor ? <Button variant="ghost" size="icon" aria-label={`Limpiar ${etiqueta.toLowerCase()}`} title={`Limpiar ${etiqueta.toLowerCase()}`} onClick={() => onCambio("")}><X className="size-4" /></Button> : null}
      </div>
    </div>
  );
}

export function FiltroFechas({ id, periodo, onPeriodoCambio, desde, hasta, onDesdeCambio, onHastaCambio, className = "" }: {
  id: string; periodo: PeriodoFecha; onPeriodoCambio: (periodo: PeriodoFecha) => void;
  desde: string; hasta: string; onDesdeCambio: (valor: string) => void; onHastaCambio: (valor: string) => void; className?: string;
}) {
  return (
    <div className={`flex min-w-0 flex-wrap items-end gap-3 ${className}`}>
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`${id}-periodo`}>Periodo</Label>
        <Select value={periodo} onValueChange={(valor) => onPeriodoCambio(periodoValido(valor))}>
          <SelectTrigger id={`${id}-periodo`} className="w-48 max-w-full"><SelectValue /></SelectTrigger>
          <SelectContent>{PERIODOS_FECHA.map((opcion) => <SelectItem key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {periodo === "rango" ? <>
        <FechaFiltro id={`${id}-desde`} etiqueta="Fecha inicio" valor={desde} onCambio={onDesdeCambio} />
        <FechaFiltro id={`${id}-hasta`} etiqueta="Fecha fin" valor={hasta} onCambio={onHastaCambio} />
        {desde && hasta && desde > hasta ? <p role="alert" className="text-sm text-destructive">La fecha inicio debe ser anterior o igual a la fecha fin.</p> : null}
      </> : null}
    </div>
  );
}