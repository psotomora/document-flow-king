import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Coins, FileDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { SelectorFilas } from "@/components/comunes/SelectorFilas";
import { useFilasVisibles } from "@/lib/preferencias";
import { TarjetaIndicador } from "@/components/comunes/TarjetaIndicador";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import type { Banco, Moneda, Transferencia } from "@/data/tipos";
import { calcularSaldosPorBanco, totalizarSaldos } from "@/lib/calculos";
import { formatearMoneda, formatearNumero } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/bancos")({
  head: () => ({
    meta: [
      { title: "Saldo disponible por banco | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Saldo inicial, pagos recibidos, erogaciones y saldo neto por cuenta bancaria, separado por moneda.",
      },
      { property: "og:title", content: "Saldo disponible por banco | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Disponibilidad real de efectivo en cada cuenta bancaria.",
      },
    ],
  }),
  component: PaginaBancos,
});

function PaginaBancos() {
  const {
    filas: filasVisibles,
    estiloTabla,
    establecer: establecerFilas,
  } = useFilasVisibles("bancos");
  const {
    bancos,
    pagos,
    erogaciones,
    transferencias,
    agregarTransferencia,
    eliminarTransferencia,
    puedeEditar,
    hoy,
    companiaActiva,
    companias,
    usuario,
    tipoCambio,
    esAdministrador,
    actualizarBanco,
  } = useApp();
  const [enEdicion, setEnEdicion] = useState<Banco | null>(null);
  const [transferir, setTransferir] = useState(false);

  const visibles = filtrarPorCompania(bancos, companiaActiva).filter((b) => b.activo);

  const saldos = useMemo(
    () => ({
      USD: calcularSaldosPorBanco(visibles, pagos, erogaciones, "USD", transferencias),
      CRC: calcularSaldosPorBanco(visibles, pagos, erogaciones, "CRC", transferencias),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bancos, pagos, erogaciones, transferencias, companiaActiva],
  );

  const totalUSD = totalizarSaldos(saldos.USD).saldoNeto;
  const totalCRC = totalizarSaldos(saldos.CRC).saldoNeto;
  const equivalenteUSD = tipoCambio > 0 ? totalCRC / tipoCambio : 0;
  const consolidadoUSD = totalUSD + equivalenteUSD;

  const exportar = (moneda: Moneda) =>
    exportarExcel(
      `saldo-por-banco-${moneda.toLowerCase()}`,
      `Saldos ${moneda}`,
      saldos[moneda].map((s) => ({
        Compañía: companias.find((c) => c.id === s.companiaId)?.codigo ?? "",
        Banco: s.nombre,
        "Saldo inicial": s.saldoInicial,
        "Pagos recibidos": s.pagosRecibidos,
        "Saldo actual": s.saldoActual,
        Erogaciones: s.erogaciones,
        "Transferencias recibidas": s.transferenciasEntrada,
        "Transferencias enviadas": s.transferenciasSalida,
        "Saldo disponible": s.saldoNeto,
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Saldo disponible por banco"
        requerimiento="RF-008"
        descripcion="Saldo disponible = saldo inicial + pagos recibidos − erogaciones. Los montos en dólares y en colones nunca se mezclan."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TarjetaIndicador
          titulo="Saldo disponible USD"
          valor={formatearMoneda(totalUSD, "USD")}
          detalle="Suma de cuentas en dólares"
        />
        <TarjetaIndicador
          titulo="Saldo disponible CRC"
          valor={formatearMoneda(totalCRC, "CRC")}
          detalle="Suma de cuentas en colones"
        />
        <TarjetaIndicador
          titulo="Colones en USD"
          valor={formatearMoneda(equivalenteUSD, "USD")}
          detalle={`Tipo de cambio ₡${formatearNumero(tipoCambio)}`}
        />
        <TarjetaIndicador
          titulo="Consolidado en USD"
          valor={formatearMoneda(consolidadoUSD, "USD")}
          detalle="Dólares + colones convertidos"
          tono="primario"
          icono={<Coins className="size-4" />}
        />
      </div>

      {puedeEditar ? (
        <div className="flex justify-end">
          <Button className="gap-1.5" onClick={() => setTransferir(true)}>
            <ArrowLeftRight className="size-4" /> Nueva transferencia
          </Button>
        </div>
      ) : null}

      <div className="space-y-8">
        {(["USD", "CRC"] as Moneda[]).map((moneda) => {
          const filas = saldos[moneda];
          const total = totalizarSaldos(filas);
          return (
            <section key={moneda} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">
                  {moneda === "USD" ? "Dólares (USD)" : "Colones (CRC)"}
                </h2>
                <div className="flex items-center gap-3">
                  <SelectorFilas
                    id={`filas-bancos-${moneda}`}
                    filas={filasVisibles}
                    onCambio={establecerFilas}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => exportar(moneda)}
                  >
                    <FileDown className="size-4" /> Exportar Excel
                  </Button>
                </div>
              </div>
              <div
                style={estiloTabla}
                className="max-h-[var(--alto-tabla)] overflow-auto rounded-lg border border-border bg-card [&>div]:overflow-visible"
              >
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-card shadow-sm [&_th]:bg-card">
                    <TableRow>
                      <TableHead>Banco</TableHead>
                      <TableHead>Compañía</TableHead>
                      <TableHead className="text-right">Saldo inicial</TableHead>
                      <TableHead className="text-right">Pagos recibidos</TableHead>
                      <TableHead className="text-right">Saldo actual</TableHead>
                      <TableHead className="text-right">Erogaciones</TableHead>
                      <TableHead className="text-right">Transferencias</TableHead>
                      <TableHead className="text-right">Saldo disponible</TableHead>
                      {esAdministrador ? (
                        <TableHead className="w-16 text-right">Editar</TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((s) => (
                      <TableRow key={s.bancoId}>
                        <TableCell className="font-medium">{s.nombre}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {companias.find((c) => c.id === s.companiaId)?.codigo}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(s.saldoInicial, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-exito">
                          {formatearMoneda(s.pagosRecibidos, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(s.saldoActual, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums text-destructive">
                          −{formatearMoneda(s.erogaciones, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(s.transferenciasEntrada - s.transferenciasSalida, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums">
                          {formatearMoneda(s.saldoNeto, moneda)}
                        </TableCell>
                        {esAdministrador ? (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Editar saldos de ${s.nombre}`}
                              onClick={() =>
                                setEnEdicion(bancos.find((b) => b.id === s.bancoId) ?? null)
                              }
                            >
                              <Pencil className="size-4" />
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                    {filas.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={esAdministrador ? 9 : 8}
                          className="py-10 text-center text-muted-foreground"
                        >
                          No hay cuentas bancarias activas para la compañía seleccionada.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                  {filas.length ? (
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={2}>Total {moneda}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(total.saldoInicial, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(total.pagosRecibidos, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(total.saldoActual, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          −{formatearMoneda(total.erogaciones, moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {formatearMoneda(
                            total.transferenciasEntrada - total.transferenciasSalida,
                            moneda,
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold tabular-nums">
                          {formatearMoneda(total.saldoNeto, moneda)}
                        </TableCell>
                        {esAdministrador ? <TableCell /> : null}
                      </TableRow>
                    </TableFooter>
                  ) : null}
                </Table>
              </div>
            </section>
          );
        })}
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">
          Transferencias entre bancos y compañías
        </h2>
        <div className="overflow-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Comentarios</TableHead>
                {esAdministrador ? <TableHead className="w-16" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {transferencias.map((t) => {
                const origen = bancos.find((b) => b.id === t.bancoOrigenId);
                const destino = bancos.find((b) => b.id === t.bancoDestinoId);
                const codigo = (id: string) => companias.find((c) => c.id === id)?.codigo ?? "";
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.fecha}</TableCell>
                    <TableCell className="font-medium">{t.referencia}</TableCell>
                    <TableCell className="text-sm">
                      {codigo(t.companiaOrigenId)} · {origen?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {codigo(t.companiaDestinoId)} · {destino?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatearMoneda(t.monto, t.moneda)}
                    </TableCell>
                    <TableCell className="max-w-[24rem] truncate text-xs text-muted-foreground">
                      {t.comentarios ?? ""}
                    </TableCell>
                    {esAdministrador ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Eliminar transferencia ${t.referencia}`}
                          onClick={() => {
                            eliminarTransferencia(t.id);
                            toast.success("Transferencia eliminada");
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
              {transferencias.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={esAdministrador ? 7 : 6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Aún no se han registrado transferencias entre cuentas.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>

      <DialogoTransferencia
        abierto={transferir}
        bancos={bancos}
        companias={companias}
        hoy={hoy}
        alCerrar={() => setTransferir(false)}
        alGuardar={async (datos) => {
          const ok = await agregarTransferencia(datos);
          if (ok) {
            setTransferir(false);
            toast.success("Transferencia registrada");
          }
        }}
      />

      <DialogoSaldos
        banco={enEdicion}
        alCerrar={() => setEnEdicion(null)}
        alGuardar={(id, cambios) => {
          actualizarBanco(id, cambios);
          setEnEdicion(null);
          toast.success("Saldos actualizados y registrados en la bitácora");
        }}
      />
    </div>
  );
}

function DialogoSaldos({
  banco,
  alCerrar,
  alGuardar,
}: {
  banco: Banco | null;
  alCerrar: () => void;
  alGuardar: (id: string, cambios: Partial<Banco>) => void;
}) {
  const [usd, setUsd] = useState("");
  const [crc, setCrc] = useState("");
  const [cargado, setCargado] = useState<string | null>(null);

  if (banco && cargado !== banco.id) {
    setCargado(banco.id);
    setUsd(String(banco.saldoInicialUSD));
    setCrc(String(banco.saldoInicialCRC));
  }

  const guardar = () => {
    if (!banco) return;
    const nuevoUsd = Number(usd);
    const nuevoCrc = Number(crc);
    if (!Number.isFinite(nuevoUsd) || !Number.isFinite(nuevoCrc)) {
      toast.error("Digite montos numéricos válidos.");
      return;
    }
    alGuardar(banco.id, { saldoInicialUSD: nuevoUsd, saldoInicialCRC: nuevoCrc });
  };

  return (
    <Dialog
      open={banco !== null}
      onOpenChange={(abierto) => {
        if (!abierto) {
          setCargado(null);
          alCerrar();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar saldos iniciales</DialogTitle>
          <DialogDescription>
            {banco?.nombre}. El cambio queda registrado en la bitácora con su usuario.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="b-usd">Saldo inicial USD</Label>
            <Input
              id="b-usd"
              type="number"
              step="0.01"
              value={usd}
              onChange={(e) => setUsd(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="b-crc">Saldo inicial CRC</Label>
            <Input
              id="b-crc"
              type="number"
              step="0.01"
              value={crc}
              onChange={(e) => setCrc(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Registro de un traslado de fondos entre dos cuentas bancarias. */
function DialogoTransferencia({
  abierto,
  bancos,
  companias,
  hoy,
  alCerrar,
  alGuardar,
}: {
  abierto: boolean;
  bancos: Banco[];
  companias: { id: string; codigo: string; nombre: string }[];
  hoy: string;
  alCerrar: () => void;
  alGuardar: (datos: Omit<Transferencia, "id">) => void;
}) {
  const activos = bancos.filter((b) => b.activo);
  const [fecha, setFecha] = useState(hoy);
  const [referencia, setReferencia] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("USD");
  const [monto, setMonto] = useState("");
  const [comentarios, setComentarios] = useState("");

  const etiqueta = (b: Banco) =>
    `${companias.find((c) => c.id === b.companiaId)?.codigo ?? ""} · ${b.nombre}`;

  const limpiar = () => {
    setFecha(hoy);
    setReferencia("");
    setOrigen("");
    setDestino("");
    setMoneda("USD");
    setMonto("");
    setComentarios("");
  };

  const guardar = () => {
    const bancoOrigen = activos.find((b) => b.id === origen);
    const bancoDestino = activos.find((b) => b.id === destino);
    const valor = Number(monto);
    if (!referencia.trim()) {
      toast.error("Digite la referencia de la transferencia.");
      return;
    }
    if (!bancoOrigen || !bancoDestino) {
      toast.error("Seleccione la cuenta de origen y la de destino.");
      return;
    }
    if (bancoOrigen.id === bancoDestino.id) {
      toast.error("La cuenta de destino debe ser distinta a la de origen.");
      return;
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error("Digite un monto mayor que cero.");
      return;
    }
    alGuardar({
      fecha,
      referencia: referencia.trim(),
      companiaOrigenId: bancoOrigen.companiaId,
      bancoOrigenId: bancoOrigen.id,
      companiaDestinoId: bancoDestino.companiaId,
      bancoDestinoId: bancoDestino.id,
      moneda,
      monto: valor,
      comentarios: comentarios.trim() || null,
    });
    limpiar();
  };

  return (
    <Dialog
      open={abierto}
      onOpenChange={(v) => {
        if (!v) {
          limpiar();
          alCerrar();
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Transferencia entre bancos</DialogTitle>
          <DialogDescription>
            El monto se rebaja de la cuenta de origen y se suma a la de destino, aunque sean de
            compañías distintas. Ambas cuentas usan la misma moneda.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="t-fecha">Fecha</Label>
              <Input
                id="t-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-ref">Referencia</Label>
              <Input
                id="t-ref"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="N.º de transferencia"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Cuenta de origen</Label>
            <Select value={origen} onValueChange={setOrigen}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione la cuenta de donde sale el dinero" />
              </SelectTrigger>
              <SelectContent>
                {activos.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {etiqueta(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Cuenta de destino</Label>
            <Select value={destino} onValueChange={setDestino}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione la cuenta que recibe el dinero" />
              </SelectTrigger>
              <SelectContent>
                {activos.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {etiqueta(b)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Moneda</Label>
              <Select value={moneda} onValueChange={(v) => setMoneda(v as Moneda)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">Dólares (USD)</SelectItem>
                  <SelectItem value="CRC">Colones (CRC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-monto">Monto</Label>
              <Input
                id="t-monto"
                type="number"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="t-coment">Comentarios</Label>
            <Textarea
              id="t-coment"
              rows={3}
              maxLength={300}
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Motivo del traslado de fondos"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
