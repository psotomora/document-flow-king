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
import type { Moneda } from "@/data/tipos";
import type { FacturaCalculada } from "@/lib/calculos";
import { formatearMoneda } from "@/lib/formato";

/** Movimiento de crédito leído del estado de cuenta. */
interface Movimiento {
  clave: string;
  fecha: string;
  referencia: string;
  monto: number;
}

interface EstadoFila {
  facturaId: string;
  tc: string;
  aplicado: boolean;
  omitido: boolean;
}

const normalizar = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const CLAVES_FECHA = ["fecha", "fechaoperacion", "fechatransaccion", "ftransaccion", "fechacontable", "date", "fechamovimiento"];
const CLAVES_REF = ["referencia", "descripcion", "detalle", "concepto", "documento", "numtransaccion", "numerodocumento", "description", "reference"];
const CLAVES_CREDITO = ["credito", "creditos", "deposito", "depositos", "abono", "abonos", "entrada", "entradas", "credit"];
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
    const d = new Date(Math.round((v - 25569) * 86400000));
    return d.toISOString().slice(0, 10);
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

/** Saldo de la factura convertido a la moneda del depósito con el TC de referencia. */
function saldoEnMoneda(f: FacturaCalculada, moneda: Moneda, tc: number): number {
  if (f.moneda === moneda) return f.saldoPendiente;
  return f.moneda === "USD" ? f.saldoPendiente * tc : f.saldoPendiente / tc;
}

/** Margen de coincidencia para pagos en otra moneda (fluctuación cambiaria). */
const MARGEN_CRUZADO = 0.03;

export function ConciliacionEstadoCuenta() {
  const { facturasCalculadas, bancos, companiaActiva, agregarPago, tipoCambio, puedeEditar } = useApp();
  const bancosActivos = filtrarPorCompania(
    bancos.filter((b) => b.activo),
    companiaActiva,
  );
  const [bancoId, setBancoId] = useState(bancosActivos[0]?.id ?? "");
  const [moneda, setMoneda] = useState<Moneda>("CRC");
  const [archivo, setArchivo] = useState("");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [estado, setEstado] = useState<Record<string, EstadoFila>>({});
  const [procesando, setProcesando] = useState<string | null>(null);

  const banco = bancos.find((b) => b.id === bancoId);
  const pendientes = useMemo(
    () =>
      facturasCalculadas.filter(
        (f) => f.saldoPendiente > 0.009 && (!banco || f.companiaId === banco.companiaId),
      ),
    [facturasCalculadas, banco],
  );

  /** Sugerencias por monto: exacta en la misma moneda, o aproximada en moneda cruzada. */
  const sugerencias = useMemo(() => {
    const mapa: Record<string, { exactas: FacturaCalculada[]; cruzadas: FacturaCalculada[] }> = {};
    for (const m of movimientos) {
      const exactas = pendientes.filter(
        (f) => f.moneda === moneda && Math.abs(f.saldoPendiente - m.monto) < 0.01,
      );
      const cruzadas = pendientes
        .filter((f) => f.moneda !== moneda)
        .filter((f) => {
          const equivalente = saldoEnMoneda(f, moneda, tipoCambio);
          return equivalente > 0 && Math.abs(equivalente - m.monto) / equivalente <= MARGEN_CRUZADO;
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

  /** TC implícito: monto depositado / saldo de la factura (o inverso si la factura es en CRC). */
  const tcImplicito = (f: FacturaCalculada, monto: number) => {
    if (f.moneda === moneda || f.saldoPendiente <= 0) return "";
    const tc = f.moneda === "USD" ? monto / f.saldoPendiente : f.saldoPendiente / monto;
    return tc.toFixed(4);
  };

  const cargar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const XLSX = await import("xlsx");
      const libro = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const hoja = libro.Sheets[libro.SheetNames[0]!]!;
      // Algunos bancos ponen títulos antes de los encabezados: se busca la primera fila con columnas reconocibles.
      const matriz = XLSX.utils.sheet_to_json<unknown[]>(hoja, { header: 1, defval: "" });
      const filaEnc = matriz.findIndex((fila) => {
        const enc = fila.map((c) => String(c));
        return buscarColumna(enc, CLAVES_FECHA) && (buscarColumna(enc, CLAVES_CREDITO) || buscarColumna(enc, CLAVES_MONTO));
      });
      if (filaEnc < 0) {
        toast.error("No se reconocieron las columnas de fecha y monto/crédito en el archivo.");
        return;
      }
      const encabezados = (matriz[filaEnc] ?? []).map((c) => String(c));
      const colFecha = buscarColumna(encabezados, CLAVES_FECHA)!;
      const colRef = buscarColumna(encabezados, CLAVES_REF);
      const colCredito = buscarColumna(encabezados, CLAVES_CREDITO);
      const colMonto = colCredito ?? buscarColumna(encabezados, CLAVES_MONTO)!;
      const idx = (c?: string) => (c ? encabezados.indexOf(c) : -1);

      const lista: Movimiento[] = [];
      matriz.slice(filaEnc + 1).forEach((fila, i) => {
        const monto = aNumero(fila[idx(colMonto)]);
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
      toast.success(`${lista.length} depósitos leídos del estado de cuenta`);
    } catch {
      toast.error("No fue posible leer el archivo. Use Excel (.xlsx, .xls) o CSV.");
    }
  };

  // Inicializa la sugerencia de cada fila al cargar o cambiar la moneda.
  const filaDe = (m: Movimiento): EstadoFila => {
    const actual = estado[m.clave];
    if (actual) return actual;
    const s = sugerencias[m.clave];
    const f = s?.exactas.length === 1 ? s.exactas[0] : s && !s.exactas.length && s.cruzadas.length ? s.cruzadas[0] : undefined;
    return { facturaId: f?.id ?? "", tc: f ? tcImplicito(f, m.monto) : "", aplicado: false, omitido: false };
  };

  const actualizar = (m: Movimiento, cambios: Partial<EstadoFila>) =>
    setEstado((prev) => ({ ...prev, [m.clave]: { ...filaDe(m), ...cambios } }));

  const elegir = (m: Movimiento, facturaId: string) => {
    const f = facturasCalculadas.find((x) => x.id === facturaId);
    actualizar(m, { facturaId, tc: f ? tcImplicito(f, m.monto) : "" });
  };

  const aplicar = async (m: Movimiento): Promise<void> => {
    const fila = filaDe(m);
    const f = facturasCalculadas.find((x) => x.id === fila.facturaId);
    if (!banco) { toast.error("Seleccione la cuenta bancaria del depósito."); return; }
    if (!f) { toast.error("Seleccione la factura a la que corresponde el depósito."); return; }
    const cruzado = f.moneda !== moneda;
    const tc = Number(fila.tc);
    if (cruzado && !(tc > 0)) { toast.error("Indique el tipo de cambio de la operación."); return; }
    const aplicadoFactura = cruzado ? (f.moneda === "USD" ? m.monto / tc : m.monto * tc) : m.monto;
    if (aplicadoFactura - f.saldoPendiente > 0.01) {
      { toast.error("El depósito excede el saldo pendiente de la factura; ajuste el tipo de cambio o elija otra factura."); return; }
    }
    setProcesando(m.clave);
    const ok = await agregarPago({
      facturaId: f.id,
      fecha: m.fecha,
      bancoId: banco.id,
      monto: m.monto,
      moneda,
      tipoCambioOperacion: cruzado ? tc : undefined,
      metodo: "Transferencia",
      referencia: m.referencia.slice(0, 60) || `Estado de cuenta ${archivo}`.slice(0, 60),
      aplicaFactura: true,
    });
    setProcesando(null);
    if (!ok) return;
    actualizar(m, { aplicado: true });
    toast.success(`Pago aplicado a la factura ${f.numero}`);
  };

  const usados = new Set(
    movimientos.map((m) => filaDe(m)).filter((e) => e.aplicado).map((e) => e.facturaId),
  );
  const aplicados = movimientos.filter((m) => filaDe(m).aplicado).length;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div>
        <h2 className="text-base font-semibold">Conciliar estado de cuenta</h2>
        <p className="text-sm text-muted-foreground">
          Cargue el estado de cuenta del banco: se sugiere la factura pendiente que coincide con cada depósito.
          Si la factura está en otra moneda, el tipo de cambio se calcula automáticamente.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Cuenta bancaria del depósito</Label>
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
            <span>{movimientos.length} depósitos · {aplicados} aplicados</span>
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
                  <TableHead className="text-right">Depósito</TableHead>
                  <TableHead>Coincidencia</TableHead>
                  <TableHead className="min-w-72">Factura</TableHead>
                  <TableHead>Tipo de cambio</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientos.map((m) => {
                  const fila = filaDe(m);
                  const s = sugerencias[m.clave] ?? { exactas: [], cruzadas: [] };
                  const factura = facturasCalculadas.find((f) => f.id === fila.facturaId);
                  const cruzado = !!factura && factura.moneda !== moneda;
                  const sugeridas = new Set([...s.exactas, ...s.cruzadas].map((f) => f.id));
                  const opciones = [
                    ...s.exactas,
                    ...s.cruzadas,
                    ...pendientes.filter((f) => !sugeridas.has(f.id)),
                  ].filter((f) => f.id === fila.facturaId || !usados.has(f.id));
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
                          valor={fila.facturaId}
                          onChange={(v) => elegir(m, v)}
                          disabled={fila.aplicado || fila.omitido}
                          placeholder="Elegir factura"
                          buscarPlaceholder="Buscar por número o cliente..."
                          opciones={opciones.map((f) => ({
                            valor: f.id,
                            etiqueta: `${f.numero} · ${f.cliente} · ${formatearMoneda(f.saldoPendiente, f.moneda)}`,
                            busqueda: `${f.numero} ${f.cliente}`,
                            destacada: sugeridas.has(f.id),
                          }))}
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
                              <Button
                                size="sm"
                                disabled={!puedeEditar || !fila.facturaId || procesando === m.clave}
                                onClick={() => void aplicar(m)}
                              >
                                Aplicar
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
