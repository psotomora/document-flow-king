import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useApp } from "@/contexto/AppContexto";
import type { Moneda } from "@/data/tipos";
import { formatearMoneda, formatearNumero } from "@/lib/formato";
import { montoPagoEnMonedaFactura } from "@/lib/calculos";
import { facturasParaPago, montoReferenciaPago } from "@/lib/pagos-facturas";

export function DialogoPago({
  abierto,
  setAbierto,
  mostrarPagadas,
  facturaInicialId,
  sinDisparador = false,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
  mostrarPagadas: boolean;
  facturaInicialId?: string;
  sinDisparador?: boolean;
}) {
  const { facturasCalculadas, bancos, agregarPago, tipoCambio, hoy } = useApp();
  const seleccionables = facturasParaPago(facturasCalculadas, mostrarPagadas);

  /** Solo cuentas activas de la compañía de la factura: así el pago se refleja en su saldo por banco. */
  const bancosPara = (companiaId?: string) =>
    bancos.filter((b) => b.activo && (!companiaId || b.companiaId === companiaId));

  const inicial = seleccionables.find((f) => f.id === facturaInicialId) ?? seleccionables[0];
  const [facturaId, setFacturaId] = useState(inicial?.id ?? "");
  const [busquedaFactura, setBusquedaFactura] = useState("");
  const [comboAbierto, setComboAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [bancoId, setBancoId] = useState(bancosPara(inicial?.companiaId)[0]?.id ?? "");
  const [moneda, setMoneda] = useState<Moneda>(inicial?.moneda ?? "USD");
  const [monto, setMonto] = useState<number>(inicial ? sugerirMonto(montoReferenciaPago(inicial)) : 0);
  const [guardando, setGuardando] = useState(false);

  /** Al elegir una factura se sugiere su saldo pendiente y su moneda; el usuario puede cambiarlos. */
  const elegirFactura = (id: string) => {
    setFacturaId(id);
    const f = facturasCalculadas.find((x) => x.id === id);
    if (f) {
      setMoneda(f.moneda);
      setMonto(sugerirMonto(montoReferenciaPago(f)));
      const opciones = bancosPara(f.companiaId);
      if (!opciones.some((b) => b.id === bancoId)) setBancoId(opciones[0]?.id ?? "");
    }
  };
  const [tc, setTc] = useState(String(tipoCambio));
  const [metodo, setMetodo] = useState("Transferencia");
  const [referencia, setReferencia] = useState("");

  const factura = facturasCalculadas.find((f) => f.id === facturaId);
  const facturaYaPagada = factura?.estado === "Pagada";
  const requiereTc = !!factura && factura.moneda !== moneda;
  const aplicado =
    factura && monto
      ? montoPagoEnMonedaFactura(
          {
            id: "tmp",
            facturaId,
            fecha,
            bancoId,
            monto,
            moneda,
            tipoCambioOperacion: Number(tc),
            metodo,
          },
          factura.moneda,
        )
      : 0;

  const guardar = async () => {
    if (!factura) {
      toast.error("Seleccione la factura a la que se aplica el pago.");
      return;
    }
    if (!bancoId) {
      toast.error("Seleccione el banco receptor del pago.");
      return;
    }
    if (!(monto > 0)) {
      toast.error("El monto del pago debe ser mayor que cero.");
      return;
    }
    if (requiereTc && !(Number(tc) > 0)) {
      toast.error("Indique el tipo de cambio de la operación.");
      return;
    }
    if (!facturaYaPagada && aplicado - factura.saldoPendiente > 0.01) {
      toast.error("El pago no puede exceder el saldo pendiente de la factura.");
      return;
    }
    setGuardando(true);
    // Se espera la confirmación del servidor: si falla, el diálogo permanece abierto con los datos.
    const ok = await agregarPago({
      facturaId,
      fecha,
      bancoId,
      monto,
      moneda,
      tipoCambioOperacion: requiereTc ? Number(tc) : undefined,
      metodo,
      referencia,
      aplicaFactura: !facturaYaPagada,
    });
    setGuardando(false);
    if (!ok) return;
    toast.success(
      facturaYaPagada
        ? "Pago registrado en el banco; la factura conserva su estado pagado"
        : "Pago registrado y aplicado a la factura",
    );
    setAbierto(false);
    setMonto(0);
    setReferencia("");
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      {!sinDisparador && <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Registrar pago
        </Button>
      </DialogTrigger>}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pago recibido</DialogTitle>
          <DialogDescription>
            {facturaYaPagada
              ? "El pago aumentará el saldo del banco sin modificar la factura, que ya está pagada."
              : "El saldo y el estado de la factura se recalculan al guardar."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Factura</Label>
            <Popover open={comboAbierto} onOpenChange={setComboAbierto}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboAbierto}
                  className="w-full justify-between font-normal"
                >
                  {factura ? (
                    <span className="truncate">
                      {factura.numero} · {factura.cliente} · saldo{" "}
                      {facturaYaPagada
                        ? "Pagada"
                        : formatearMoneda(factura.saldoPendiente, factura.moneda)}
                    </span>
                  ) : (
                    "Seleccione una factura"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Buscar por factura o cliente…"
                    value={busquedaFactura}
                    onValueChange={setBusquedaFactura}
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron facturas.</CommandEmpty>
                    <CommandGroup>
                      {seleccionables.map((f) => (
                        <CommandItem
                          key={f.id}
                          value={`${f.numero} ${f.cliente}`}
                          onSelect={() => {
                            elegirFactura(f.id);
                            setBusquedaFactura("");
                            setComboAbierto(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              facturaId === f.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="flex-1 truncate">
                            {f.numero} · {f.cliente}
                          </span>
                          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                            {f.estado === "Pagada"
                              ? `Pagada · ${formatearMoneda(f.monto, f.moneda)}`
                              : formatearMoneda(f.saldoPendiente, f.moneda)}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-fecha">Fecha del pago</Label>
            <Input
              id="p-fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Banco receptor</Label>
            <Select value={bancoId} onValueChange={setBancoId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bancosPara(factura?.companiaId).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Moneda del pago</Label>
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
            <Label htmlFor="p-monto">Monto</Label>
            <InputNumero id="p-monto" value={monto} onChange={setMonto} />
            {factura ? (
              <p className="text-xs text-muted-foreground">
                {facturaYaPagada
                  ? `Factura pagada: el monto solo se sumará al banco seleccionado.`
                  : `Sugerido: saldo pendiente ${formatearMoneda(factura.saldoPendiente, factura.moneda)}`}
              </p>
            ) : null}
          </div>
          {requiereTc ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-tc">Tipo de cambio de la operación</Label>
              <Input id="p-tc" type="number" value={tc} onChange={(e) => setTc(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                La factura está en {factura?.moneda} y el pago en {moneda}. Se aplicarán{" "}
                <span className="font-mono">
                  {factura ? formatearMoneda(aplicado, factura.moneda) : "—"}
                </span>{" "}
                a la factura.
              </p>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="p-metodo">Método</Label>
            <Input id="p-metodo" value={metodo} onChange={(e) => setMetodo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-ref">Referencia</Label>
            <Input
              id="p-ref"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Redondea el saldo a dos decimales para proponerlo como monto del pago. */
function sugerirMonto(saldo: number): number {
  return Math.round(saldo * 100) / 100;
}

function InputNumero({
  id,
  value,
  onChange,
  className,
  placeholder,
}: {
  id?: string;
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
}) {
  const [editando, setEditando] = useState(false);
  const [raw, setRaw] = useState(String(value));

  const display = formatearNumero(value);
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      className={`font-mono tabular-nums text-right ${className ?? ""}`}
      value={editando ? raw : display}
      placeholder={placeholder}
      onFocus={() => {
        setEditando(true);
        setRaw(value ? String(value).replace(".", ",") : "");
      }}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        onChange(parsearMonto(raw));
        setEditando(false);
      }}
    />
  );
}

function parsearMonto(valor: string): number {
  const limpio = valor.replace(/[^0-9.,]/g, "");
  if (!limpio) return 0;
  const separadores = [...limpio.matchAll(/[.,]/g)];
  if (separadores.length === 0) return Number(limpio) || 0;
  const ultimo = separadores[separadores.length - 1];
  if (!ultimo || ultimo.index === undefined) return 0;
  const idx = ultimo.index;
  const entero = limpio.slice(0, idx).replace(/[.,]/g, "").replace(/^0+(?=\d)/, "");
  const decimal = limpio.slice(idx + 1).replace(/[.,]/g, "").slice(0, 2).padEnd(2, "0");
  const numero = Number(`${entero || "0"}.${decimal}`);
  return Number.isFinite(numero) ? numero : 0;
}
