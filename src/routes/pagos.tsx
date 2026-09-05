import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, FileDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { cn } from "@/lib/utils";
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { Moneda } from "@/data/tipos";
import { formatearFecha, formatearMoneda, formatearNumero } from "@/lib/formato";
import { montoPagoEnMonedaFactura } from "@/lib/calculos";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos recibidos | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Registro de pagos aplicados a facturas, incluidos pagos en moneda distinta con tipo de cambio de la operación.",
      },
      { property: "og:title", content: "Pagos recibidos | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Aplicación de pagos por banco, moneda y factura.",
      },
    ],
  }),
  component: PaginaPagos,
});

function PaginaPagos() {
  const {
    pagos,
    facturasCalculadas,
    bancos,
    companiaActiva,
    puedeEditar,
    esAdministrador,
    eliminarPago,
    usuario,
  } = useApp();

  const facturasVisibles = filtrarPorCompania(facturasCalculadas, companiaActiva);
  const idsVisibles = new Set(facturasVisibles.map((f) => f.id));
  const [banco, setBanco] = useState("todos");
  const [abierto, setAbierto] = useState(false);

  const filas = useMemo(
    () =>
      pagos
        .filter((p) => idsVisibles.has(p.facturaId))
        .filter((p) => banco === "todos" || p.bancoId === banco)
        .map((p) => {
          const factura = facturasCalculadas.find((f) => f.id === p.facturaId);
          return {
            pago: p,
            factura,
            aplicado: factura ? montoPagoEnMonedaFactura(p, factura.moneda) : 0,
          };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pagos, facturasCalculadas, companiaActiva, banco],
  );

  const exportar = () =>
    exportarExcel(
      "pagos-recibidos",
      "Pagos",
      filas.map(({ pago, factura, aplicado }) => ({
        Fecha: formatearFecha(pago.fecha),
        Factura: factura?.numero ?? "",
        Cliente: factura?.cliente ?? "",
        Banco: bancos.find((b) => b.id === pago.bancoId)?.nombre ?? "",
        Moneda: pago.moneda,
        Monto: pago.monto,
        "Tipo de cambio": pago.tipoCambioOperacion ?? "",
        "Aplicado a la factura": aplicado,
        Método: pago.metodo,
        Referencia: pago.referencia ?? "",
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Pagos recibidos"
        requerimiento="RF-005"
        descripcion="Un pago siempre se asocia a una factura. Si la moneda del pago difiere de la de la factura, se registra el tipo de cambio de la operación y el sistema convierte el monto aplicado."
        acciones={
          <>
            <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
              <FileDown className="size-4" /> Exportar Excel
            </Button>
            {puedeEditar ? <DialogoPago abierto={abierto} setAbierto={setAbierto} /> : null}
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1.5">
          <Label>Banco</Label>
          <Select value={banco} onValueChange={setBanco}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los bancos</SelectItem>
              {bancos.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Factura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Banco</TableHead>
              <TableHead className="text-right">Monto del pago</TableHead>
              <TableHead className="text-right">Tipo de cambio</TableHead>
              <TableHead className="text-right">Aplicado a la factura</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Referencia</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map(({ pago, factura, aplicado }) => (
              <TableRow key={pago.id}>
                <TableCell className="whitespace-nowrap">{formatearFecha(pago.fecha)}</TableCell>
                <TableCell className="font-medium">{factura?.numero ?? "—"}</TableCell>
                <TableCell>{factura?.cliente ?? "—"}</TableCell>
                <TableCell>{bancos.find((b) => b.id === pago.bancoId)?.nombre ?? "—"}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearMoneda(pago.monto, pago.moneda)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {pago.tipoCambioOperacion ? formatearNumero(pago.tipoCambioOperacion) : "—"}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {factura ? formatearMoneda(aplicado, factura.moneda) : "—"}
                </TableCell>
                <TableCell>{pago.metodo}</TableCell>
                <TableCell className="text-muted-foreground">{pago.referencia ?? "—"}</TableCell>
                <TableCell>
                  {esAdministrador ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Eliminar pago"
                      onClick={() => {
                        eliminarPago(pago.id);
                        toast.success("Pago eliminado");
                      }}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
            {filas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                  No hay pagos registrados para los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function DialogoPago({
  abierto,
  setAbierto,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
}) {
  const { facturasCalculadas, bancos, agregarPago, tipoCambio, hoy } = useApp();
  const pendientes = facturasCalculadas.filter((f) => f.saldoPendiente > 0.009);

  /** Solo cuentas activas de la compañía de la factura: así el pago se refleja en su saldo por banco. */
  const bancosPara = (companiaId?: string) =>
    bancos.filter((b) => b.activo && (!companiaId || b.companiaId === companiaId));

  const inicial = pendientes[0];
  const [facturaId, setFacturaId] = useState(inicial?.id ?? "");
  const [busquedaFactura, setBusquedaFactura] = useState("");
  const [comboAbierto, setComboAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [bancoId, setBancoId] = useState(bancosPara(inicial?.companiaId)[0]?.id ?? "");
  const [moneda, setMoneda] = useState<Moneda>(inicial?.moneda ?? "USD");
  const [monto, setMonto] = useState<number>(inicial ? sugerirMonto(inicial.saldoPendiente) : 0);
  const [guardando, setGuardando] = useState(false);

  /** Al elegir una factura se sugiere su saldo pendiente y su moneda; el usuario puede cambiarlos. */
  const elegirFactura = (id: string) => {
    setFacturaId(id);
    const f = facturasCalculadas.find((x) => x.id === id);
    if (f) {
      setMoneda(f.moneda);
      setMonto(sugerirMonto(f.saldoPendiente));
      const opciones = bancosPara(f.companiaId);
      if (!opciones.some((b) => b.id === bancoId)) setBancoId(opciones[0]?.id ?? "");
    }
  };
  const [tc, setTc] = useState(String(tipoCambio));
  const [metodo, setMetodo] = useState("Transferencia");
  const [referencia, setReferencia] = useState("");

  const factura = facturasCalculadas.find((f) => f.id === facturaId);
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
    if (aplicado - factura.saldoPendiente > 0.01) {
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
    });
    setGuardando(false);
    if (!ok) return;
    toast.success("Pago registrado y aplicado a la factura");
    setAbierto(false);
    setMonto(0);
    setReferencia("");
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Registrar pago
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pago recibido</DialogTitle>
          <DialogDescription>
            El saldo y el estado de la factura se recalculan al guardar.
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
                      {formatearMoneda(factura.saldoPendiente, factura.moneda)}
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
                      {pendientes.map((f) => (
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
                            {formatearMoneda(f.saldoPendiente, f.moneda)}
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
                Sugerido: saldo pendiente {formatearMoneda(factura.saldoPendiente, factura.moneda)}
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
  const ultimo = separadores[separadores.length - 1]!;
  const idx = ultimo.index!;
  const entero = limpio.slice(0, idx).replace(/[.,]/g, "").replace(/^0+(?=\d)/, "");
  const decimal = limpio.slice(idx + 1).replace(/[.,]/g, "").slice(0, 2).padEnd(2, "0");
  const numero = Number(`${entero || "0"}.${decimal}`);
  return Number.isFinite(numero) ? numero : 0;
}
