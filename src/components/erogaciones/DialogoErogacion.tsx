import { FiltroFechas } from "@/components/comunes/FiltroFechas";
import { fechaEnPeriodo, type PeriodoFecha } from "@/lib/filtros-fecha";
import { Checkbox } from "@/components/ui/checkbox";
import { useCompaniaValida } from "@/hooks/use-compania-valida";
import { useMemo, useState } from "react";
import { normalizarReferencia, siguienteReferenciaConSufijo } from "@/lib/referencias-en-uso";
import { Check, ChevronsUpDown, FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { useFiltroGuardado, useFilasVisibles } from "@/lib/preferencias";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { Erogacion, Moneda } from "@/data/tipos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

import type { ContextoSinDocumento, Movimiento } from "@/components/erogaciones/ConciliacionErogaciones";

export function DialogoErogacion({
  abierto,
  setAbierto,
  erogacion,
  mostrarPagados = false,
  precarga,
  contexto,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  erogacion?: Erogacion;
  /** Incluye documentos ya pagados (saldo 0): el pago se registra sin cambiar su estado. */
  mostrarPagados?: boolean;
  /** Datos de un movimiento del estado de cuenta para precargar el formulario (sin documento). */
  precarga?: Movimiento;
  /** Banco, moneda y referencia en uso según la conciliación que abrió el diálogo. */
  contexto?: ContextoSinDocumento;
}) {
  const { companias, bancos, agregarErogacion, actualizarErogacion, erogaciones, documentosPorPagar, hoy } = useApp();
  const [documentoPagoId, setDocumentoPagoId] = useState(erogacion?.documentoPagoId ?? "sin");
  const [comboAbierto, setComboAbierto] = useState(false);
  const bancoSugerido = contexto ? bancos.find((b) => b.id === contexto.bancoId) : undefined;
  const [companiaId, setCompaniaId] = useState(erogacion?.companiaId ?? bancoSugerido?.companiaId ?? companias[0]?.id ?? "");
  useCompaniaValida(companias, companiaId, setCompaniaId);
  const [numeroTransferencia, setNumero] = useState(
    erogacion?.numeroTransferencia ?? (precarga?.referencia ?? "").slice(0, 40),
  );
  const [proveedor, setProveedor] = useState(erogacion?.proveedor ?? (precarga?.descripcion || precarga?.referencia || ""));
  const [fecha, setFecha] = useState(erogacion?.fecha ?? precarga?.fecha ?? hoy);
  const [bancoId, setBancoId] = useState(erogacion?.bancoId ?? bancoSugerido?.id ?? bancos[0]?.id ?? "");
  const [moneda, setMoneda] = useState<Moneda>(erogacion?.moneda ?? contexto?.moneda ?? "USD");
  const [monto, setMonto] = useState(erogacion ? String(erogacion.monto) : precarga ? String(precarga.monto) : "");
  const [notas, setNotas] = useState(
    erogacion?.notas ?? (precarga ? `Registrado desde estado de cuenta · ${precarga.descripcion || precarga.referencia || precarga.fecha}` : ""),
  );

  const bancosCompania = bancos.filter((b) => b.companiaId === companiaId);
  const documentosCompania = documentosPorPagar.filter(
    (d) => d.companiaId === companiaId && (d.saldo > 0 || (mostrarPagados && !erogacion)),
  );
  const documentoElegido = documentosCompania.find((d) => d.id === documentoPagoId);
  const documentoOriginalAusente = Boolean(
    erogacion?.documentoPagoId
      && erogacion.documentoPagoId === documentoPagoId
      && !documentoElegido,
  );

  /** Al elegir un documento, se precargan proveedor, moneda y saldo pendiente. */
  const elegirDocumento = (valor: string) => {
    setDocumentoPagoId(valor);
    const doc = documentosCompania.find((d) => d.id === valor);
    if (doc) {
      setProveedor(doc.proveedor);
      setMoneda(doc.moneda);
      setMonto(String(doc.saldo > 0 ? doc.saldo : doc.monto));
    }
  };

  const [aceptarRepetida, setAceptarRepetida] = useState(false);
  const refsMismaCompania = erogaciones
    .filter((e) => e.id !== erogacion?.id && e.companiaId === companiaId)
    .map((e) => e.numeroTransferencia);
  const refRepetida = normalizarReferencia(numeroTransferencia).length > 0
    && refsMismaCompania.some((r) => normalizarReferencia(r) === normalizarReferencia(numeroTransferencia));
  const sufijoSugerido = refRepetida ? siguienteReferenciaConSufijo(numeroTransferencia, refsMismaCompania) : "";

  const guardar = (forzarRepetida = false) => {
    if (!numeroTransferencia || !proveedor || !bancoId) {
      toast.error("Complete número de transferencia, proveedor y banco.");
      return;
    }
    if (!(Number(monto) > 0)) {
      toast.error("El monto debe ser mayor que cero.");
      return;
    }
    if (refRepetida && !aceptarRepetida && !forzarRepetida) {
      toast.warning("El número de transferencia ya existe. Use el sufijo sugerido o confirme la misma referencia.");
      return;
    }
    const documentoPagoIdFinal: string | null = documentoElegido?.id
      ?? (documentoOriginalAusente ? erogacion?.documentoPagoId ?? null : null);
    const documentoPagoNumeroFinal: string | null = documentoElegido?.numero
      ?? (documentoOriginalAusente ? erogacion?.documentoPagoNumero ?? null : null);
    const datos: Omit<Erogacion, "id"> = {
      companiaId,
      bancoId,
      numeroTransferencia,
      proveedor,
      fecha,
      moneda,
      monto: Number(monto),
      notas,
      documentoPagoId: documentoPagoIdFinal,
      documentoPagoNumero: documentoPagoNumeroFinal,
    };
    if (erogacion) actualizarErogacion(erogacion.id, datos);
    else agregarErogacion(datos);
    toast.success(
      erogacion
        ? "Erogación actualizada"
        : documentoElegido && documentoElegido.saldo <= 0
          ? "Pago registrado; el documento ya estaba pagado y conserva su estado"
          : "Erogación registrada",
    );
    setAbierto(false);
    setNumero("");
    setProveedor("");
    setMonto("");
    setNotas("");
    setDocumentoPagoId("sin");
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      {!erogacion && !precarga ? <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Nueva erogación
        </Button>
      </DialogTrigger> : null}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{erogacion ? "Editar erogación" : "Registrar erogación"}</DialogTitle>
          <DialogDescription>
            Se descontará del saldo del banco seleccionado en la moneda indicada.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Compañía</Label>
            <Select
              value={companiaId}
              onValueChange={(v) => {
                setCompaniaId(v);
                setBancoId(bancos.find((b) => b.companiaId === v)?.id ?? "");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Documento por pagar</Label>
            <Popover open={comboAbierto} onOpenChange={setComboAbierto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboAbierto}
                  className="w-full justify-between font-normal"
                >
                  <span className="truncate">
                    {documentoElegido
                      ? `${documentoElegido.numero} — ${documentoElegido.proveedor}`
                      : documentoOriginalAusente
                        ? erogacion?.documentoPagoNumero ?? "Documento asociado"
                        : "Sin documento"}
                  </span>
                  <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar por identificación, proveedor o documento…" />
                  <CommandList>
                    <CommandEmpty>No se encontraron documentos.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="sin documento"
                        onSelect={() => {
                          elegirDocumento("sin");
                          setComboAbierto(false);
                        }}
                      >
                        <Check className={`mr-2 size-4 ${documentoPagoId === "sin" ? "opacity-100" : "opacity-0"}`} />
                        Sin documento
                      </CommandItem>
                      {documentosCompania.map((d) => (
                        <CommandItem
                          key={d.id}
                          value={`${d.numero} ${d.proveedor} ${d.notas ?? ""} ${d.id}`}
                          onSelect={() => {
                            elegirDocumento(d.id);
                            setComboAbierto(false);
                          }}
                        >
                          <Check className={`mr-2 size-4 shrink-0 ${documentoPagoId === d.id ? "opacity-100" : "opacity-0"}`} />
                          <div className="min-w-0">
                            <p className="truncate">
                              {d.numero} — {d.proveedor}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {d.notas ? `${d.notas} · ` : ""}
                              {d.saldo > 0
                                ? `${d.moneda} ${d.saldo.toLocaleString("es-CR")}`
                                : `Pagado · ${d.moneda} ${d.monto.toLocaleString("es-CR")}`}
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Banco</Label>
            <Select value={bancoId} onValueChange={setBancoId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bancosCompania.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-num">N.º de transferencia</Label>
            <Input
              id="e-num"
              value={numeroTransferencia}
              onChange={(e) => { setNumero(e.target.value); setAceptarRepetida(false); }}
            />
            {refRepetida && !aceptarRepetida ? (
              <div className="rounded-md border border-accent bg-accent/40 p-2 text-xs space-y-2">
                <p>⚠️ Esta referencia ya está registrada. Si el banco la repitió (lote o cargo desglosado), puede:</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setNumero(sufijoSugerido)}>
                    Usar {sufijoSugerido}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAceptarRepetida(true)}>
                    Mantener la misma referencia
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-prov">Proveedor</Label>
            <Input id="e-prov" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
            {documentoElegido?.notas ? (
              <p className="text-xs text-muted-foreground">
                Descripción del documento: {documentoElegido.notas}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-fecha">Fecha</Label>
            <Input
              id="e-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CRC">CRC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-monto">Monto</Label>
            <Input
              id="e-monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="e-notas">Notas</Label>
            <Textarea id="e-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>
        </div>
        {contexto?.referenciaEnUso.length ? (
          <p className="rounded-md bg-advertencia-suave px-3 py-2 text-sm text-advertencia">
            La referencia de este movimiento ya está registrada
            {contexto.referenciaEnUso.slice(0, 3).map((r) => ` · ${r.fecha.slice(0, 10)} ${r.descripcion}`).join("")}.
            Puede omitirlo si ya fue registrado.
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          {contexto?.referenciaEnUso.length ? (
            <Button
              variant="secondary"
              onClick={() => {
                contexto.omitir();
                setAbierto(false);
              }}
            >
              Omitir
            </Button>
          ) : null}
          <Button onClick={() => guardar()}>{erogacion ? "Guardar cambios" : "Guardar erogación"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
