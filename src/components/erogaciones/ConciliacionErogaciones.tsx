import { useMemo, useState, type ChangeEvent } from "react";
import { CheckCircle2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { SelectorBuscable } from "@/components/comunes/SelectorBuscable";
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { DocumentoPorPagar, Moneda } from "@/data/tipos";
import { formatearMoneda } from "@/lib/formato";

/** Movimiento de débito (pago emitido) leído del estado de cuenta. */
export interface Movimiento {
  clave: string;
  fecha: string;
  referencia: string;
  monto: number;
}

interface EstadoFila {
  documentoId: string;
  tc: string;
  aplicado: boolean;
  omitido: boolean;
}

const SIN_DOCUMENTO = "__sin__";

const normalizar = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

const CLAVES_FECHA = ["fecha", "fechaoperacion", "fechatransaccion", "ftransaccion", "fechacontable", "date", "fechamovimiento"];
const CLAVES_REF = ["referencia", "descripcion", "detalle", "concepto", "documento", "numtransaccion", "numerodocumento", "description", "reference"];
const CLAVES_DEBITO = ["debito", "debitos", "retiro", "retiros", "cargo", "cargos", "salida", "salidas", "debit", "withdrawal"];
const CLAVES_MONTO = ["monto", "importe", "amount", "valor"];

function buscarColumna(encabezados: string[], claves: string[]): string | undefined {
  const norm = encabezados.map((h) => ({ h, n: normalizar(h) }));
  return (
    norm.find((x) => claves.includes(x.n))?.h ??
    norm.find((x) => claves.some((c) => x.n.startsWith(c) || x.n.includes(c)))?.h
  );
}

function aNumero(v: unknown): number {
  if (typeof v === "number") return v;
  let s = String(v ?? "").trim().replace(/[^\d.,()-]/g, "");
  if (!s) return 0;
  const negativo = s.startsWith("(") || s.startsWith("-");
  s = s.replace(/[()-]/g, "");
  const ultComa = s.lastIndexOf(",");
  const ultPunto = s.lastIndexOf(".");
  if (ultComa > ultPunto) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? (negativo ? -n : n) : 0;
}

function aFechaIso(v: unknown): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && v > 20000 && v < 80000) {
    return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2]!.padStart(2, "0")}-${m[3]!.padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const anio = m[3]!.length === 2 ? `20${m[3]}` : m[3]!;
    return `${anio}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
  }
  return "";
}

function saldoEnMoneda(d: DocumentoPorPagar, moneda: Moneda, tc: number): number {
  if (d.moneda === moneda) return d.saldo;
  return d.moneda === "USD" ? d.saldo * tc : d.saldo / tc;
}

const MARGEN_CRUZADO = 0.03;

/**
 * Concilia los débitos del estado de cuenta con los documentos por pagar:
 * sugiere el documento por monto y, al aplicar, registra la erogación.
 */
export function ConciliacionErogaciones({
  onSinDocumento,
}: {
  /** Abre el diálogo de nueva erogación precargado con los datos del movimiento. */
  onSinDocumento?: (m: Movimiento) => void;
}) {
  const { documentosPorPagar, bancos, companiaActiva, agregarErogacion, erogaciones, tipoCambio, puedeEditar } =
    useApp();
  const bancosActivos = filtrarPorCompania(bancos.filter((b) => b.activo), companiaActiva);
  const [bancoId, setBancoId] = useState(bancosActivos[0]?.id ?? "");
  const [moneda, setMoneda] = useState<Moneda>("CRC");
  const [archivo, setArchivo] = useState("");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [estado, setEstado] = useState<Record<string, EstadoFila>>({});

  const banco = bancos.find((b) => b.id === bancoId);
  const pendientes = useMemo(
    () => documentosPorPagar.filter((d) => d.saldo > 0.009 && (!banco || d.companiaId === banco.companiaId)),
    [documentosPorPagar, banco],
  );

  const sugerencias = useMemo(() => {
    const mapa: Record<string, { exactas: DocumentoPorPagar[]; cruzadas: DocumentoPorPagar[] }> = {};
    for (const m of movimientos) {
      const exactas = pendientes.filter((d) => d.moneda === moneda && Math.abs(d.saldo - m.monto) < 0.01);
      const cruzadas = pendientes
        .filter((d) => d.moneda !== moneda)
        .filter((d) => {
          const eq = saldoEnMoneda(d, moneda, tipoCambio);
          return eq > 0 && Math.abs(eq - m.monto) / eq <= MARGEN_CRUZADO;
        })
        .sort(
          (a, b) =>
            Math.abs(saldoEnMoneda(a, moneda, tipoCambio) - m.monto) -
            Math.abs(saldoEnMoneda(b, moneda, tipoCambio) - m.monto),
        );
      mapa[m.clave] = { exactas, cruzadas };
    }
    return mapa;
  }, [movimientos, pendientes, moneda, tipoCambio]);

  const tcImplicito = (d: DocumentoPorPagar, monto: number) => {
    if (d.moneda === moneda || d.saldo <= 0) return "";
    return (d.moneda === "USD" ? monto / d.saldo : d.saldo / monto).toFixed(4);
  };

  const cargar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const libro = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const hoja = libro.Sheets[libro.SheetNames[0]!]!;
      const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: "" });
      const filaEnc = matriz.findIndex((fila) => {
        const enc = fila.map((c) => String(c));
        return buscarColumna(enc, CLAVES_FECHA) && (buscarColumna(enc, CLAVES_DEBITO) || buscarColumna(enc, CLAVES_MONTO));
      });
      if (filaEnc < 0) {
        toast.error("No se reconocieron las columnas de fecha y monto/débito en el archivo.");
        return;
      }
      const encabezados = (matriz[filaEnc] ?? []).map((c) => String(c));
      const colFecha = buscarColumna(encabezados, CLAVES_FECHA)!;
      const colRef = buscarColumna(encabezados, CLAVES_REF);
      const colDebito = buscarColumna(encabezados, CLAVES_DEBITO);
      const colMonto = colDebito ?? buscarColumna(encabezados, CLAVES_MONTO)!;
      const idx = (c?: string) => (c ? encabezados.indexOf(c) : -1);

      const lista: Movimiento[] = [];
      matriz.slice(filaEnc + 1).forEach((fila, i) => {
        const bruto = aNumero(fila[idx(colMonto)]);
        // Con columna de débitos se toman los positivos; con una sola columna de monto, los negativos.
        const monto = colDebito ? Math.abs(bruto) : bruto < 0 ? -bruto : 0;
        const fecha = aFechaIso(fila[idx(colFecha)]);
        if (!(monto > 0) || !fecha) return;
        lista.push({
          clave: `${i}-${fecha}-${monto}`,
          fecha,
          referencia: colRef ? String(fila[idx(colRef)] ?? "").trim() : "",
          monto: Math.round(monto * 100) / 100,
        });
      });
      setMovimientos(lista);
      setArchivo(file.name);
      setEstado({});
      toast.success(`${lista.length} pagos emitidos leídos del estado de cuenta`);
    } catch {
      toast.error("No fue posible leer el archivo. Use Excel (.xlsx, .xls) o CSV.");
    }
  };

  const filaDe = (m: Movimiento): EstadoFila => {
    const actual = estado[m.clave];
    if (actual) return actual;
    const s = sugerencias[m.clave];
    const d = s?.exactas.length === 1 ? s.exactas[0] : s && !s.exactas.length && s.cruzadas.length ? s.cruzadas[0] : undefined;
    return { documentoId: d?.id ?? "", tc: d ? tcImplicito(d, m.monto) : "", aplicado: false, omitido: false };
  };

  const actualizar = (m: Movimiento, cambios: Partial<EstadoFila>) =>
    setEstado((prev) => ({ ...prev, [m.clave]: { ...filaDe(m), ...cambios } }));

  const elegir = (m: Movimiento, documentoId: string) => {
    const d = documentosPorPagar.find((x) => x.id === documentoId);
    actualizar(m, { documentoId, tc: d ? tcImplicito(d, m.monto) : "" });
  };

  const numeroUnico = (m: Movimiento) => {
    const usados = new Set(erogaciones.map((e) => e.numeroTransferencia));
    const base = (m.referencia || `EC-${m.fecha}`).slice(0, 40);
    if (!usados.has(base)) return base;
    let n = 2;
    while (usados.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  };

  const aplicar = (m: Movimiento) => {
    const fila = filaDe(m);
    if (!banco) { toast.error("Seleccione la cuenta bancaria del pago."); return; }
    const d = documentosPorPagar.find((x) => x.id === fila.documentoId);
    if (!d && fila.documentoId !== SIN_DOCUMENTO) { toast.error("Seleccione el documento por pagar o «Sin documento»."); return; }
    const cruzado = !!d && d.moneda !== moneda;
    const tc = Number(fila.tc);
    if (cruzado && !(tc > 0)) { toast.error("Indique el tipo de cambio de la operación."); return; }
    if (d && !cruzado && m.monto - d.saldo > 0.01) {
      toast.error("El pago excede el saldo del documento; elija otro documento.");
      return;
    }
    agregarErogacion({
      companiaId: banco.companiaId,
      bancoId: banco.id,
      numeroTransferencia: numeroUnico(m),
      proveedor: d?.proveedor ?? (m.referencia || "Pago según estado de cuenta"),
      fecha: m.fecha,
      moneda,
      monto: m.monto,
      notas: [
        `Conciliado desde estado de cuenta ${archivo}`,
        cruzado ? `Documento en ${d!.moneda}, tipo de cambio ${tc}` : "",
      ].filter(Boolean).join(" · "),
      // En moneda cruzada solo se guarda la referencia: el saldo del documento se rebaja en su propia moneda.
      documentoPagoId: d && !cruzado ? d.id : null,
      documentoPagoNumero: d ? d.numero : null,
    });
    actualizar(m, { aplicado: true });
    toast.success(d ? `Pago registrado para el documento ${d.numero}` : "Erogación registrada");
  };

  const usados = new Set(movimientos.map((m) => filaDe(m)).filter((e) => e.aplicado).map((e) => e.documentoId));
  const aplicados = movimientos.filter((m) => filaDe(m).aplicado).length;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div>
        <h2 className="text-base font-semibold">Conciliar pagos emitidos</h2>
        <p className="text-sm text-muted-foreground">
          Cargue el estado de cuenta del banco: se sugiere el documento por pagar que coincide con cada pago.
          Si el documento está en otra moneda, el tipo de cambio se calcula automáticamente.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Cuenta bancaria del pago</Label>
          <Select value={bancoId} onValueChange={(v) => { setBancoId(v); setEstado({}); }}>
            <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              {bancosActivos.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Moneda de la cuenta</Label>
          <Select value={moneda} onValueChange={(v) => { setMoneda(v as Moneda); setEstado({}); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="CRC">Colones (CRC)</SelectItem>
              <SelectItem value="USD">Dólares (USD)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Archivo (.xlsx, .xls, .csv)</Label>
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent">
            <Upload className="size-4" />
            <span className="truncate">{archivo || "Seleccionar estado de cuenta"}</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={cargar} disabled={!puedeEditar} />
          </label>
        </div>
      </div>

      {movimientos.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{movimientos.length} pagos · {aplicados} aplicados</span>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setMovimientos([]); setArchivo(""); setEstado({}); }}>
              <X className="size-4" /> Limpiar
            </Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead>Coincidencia</TableHead>
                  <TableHead className="min-w-72">Documento por pagar</TableHead>
                  <TableHead>Tipo de cambio</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => {
                  const fila = filaDe(m);
                  const s = sugerencias[m.clave] ?? { exactas: [], cruzadas: [] };
                  const doc = documentosPorPagar.find((d) => d.id === fila.documentoId);
                  const cruzado = !!doc && doc.moneda !== moneda;
                  const sugeridas = new Set([...s.exactas, ...s.cruzadas].map((d) => d.id));
                  const opciones = [
                    ...s.exactas,
                    ...s.cruzadas,
                    ...pendientes.filter((d) => !sugeridas.has(d.id)),
                  ].filter((d) => d.id === fila.documentoId || !usados.has(d.id));
                  const etiqueta = fila.aplicado
                    ? <Badge className="bg-exito text-exito-foreground">Aplicado</Badge>
                    : fila.omitido
                      ? <Badge variant="outline">Omitido</Badge>
                      : s.exactas.length === 1
                        ? <Badge className="bg-exito-suave text-exito">Exacta</Badge>
                        : s.exactas.length > 1
                          ? <Badge className="bg-advertencia-suave text-advertencia">Varias ({s.exactas.length})</Badge>
                          : s.cruzadas.length
                            ? <Badge className="bg-advertencia-suave text-advertencia">Otra moneda</Badge>
                            : <Badge variant="outline">Sin coincidencia</Badge>;
                  return (
                    <TableRow key={m.clave} className={fila.aplicado || fila.omitido ? "opacity-60" : ""}>
                      <TableCell className="whitespace-nowrap">{m.fecha}</TableCell>
                      <TableCell className="max-w-48 truncate" title={m.referencia}>{m.referencia || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">{formatearMoneda(m.monto, moneda)}</TableCell>
                      <TableCell>{etiqueta}</TableCell>
                      <TableCell>
                        <SelectorBuscable
                          valor={fila.documentoId}
                          onChange={(v) => elegir(m, v)}
                          disabled={fila.aplicado || fila.omitido}
                          placeholder="Elegir documento"
                          buscarPlaceholder="Buscar por número o proveedor..."
                          opciones={[
                            { valor: SIN_DOCUMENTO, etiqueta: "Sin documento (erogación general)" },
                            ...opciones.map((d) => ({
                              valor: d.id,
                              etiqueta: `${d.numero} · ${d.proveedor} · ${formatearMoneda(d.saldo, d.moneda)}`,
                              busqueda: `${d.numero} ${d.proveedor}`,
                              destacada: sugeridas.has(d.id),
                            })),
                          ]}
                        />
                      </TableCell>
                      <TableCell>
                        {cruzado ? (
                          <Input
                            className="h-8 w-28"
                            type="number"
                            step="0.0001"
                            value={fila.tc}
                            disabled={fila.aplicado}
                            onChange={(e) => actualizar(m, { tc: e.target.value })}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {fila.aplicado ? (
                          <CheckCircle2 className="ml-auto size-5 text-exito" />
                        ) : (
                          <div className="flex justify-end gap-1">
                            {!fila.omitido && (
                              <Button size="sm" disabled={!puedeEditar || !fila.documentoId} onClick={() => aplicar(m)}>
                                Aplicar
                              </Button>
                            )}
                            {!fila.omitido && onSinDocumento && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!puedeEditar}
                                title="Registrar como erogación sin documento, con los datos del movimiento"
                                onClick={() => onSinDocumento(m)}
                              >
                                Sin documento
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => actualizar(m, { omitido: !fila.omitido })}>
                              {fila.omitido ? "Restaurar" : "Omitir"}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
