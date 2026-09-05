import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaIndicador } from "@/components/comunes/TarjetaIndicador";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { ConexionSoftland } from "@/components/parametros/ConexionSoftland";
import {
  FUENTES_PEDIDOS,
  FUENTE_PEDIDOS_DEFECTO,
  PARAM_PEDIDOS_FUENTE_EXTERNA,
  PARAM_PEDIDOS_FUENTE_ORIGEN,
  PARAM_FACTURAS_FUENTE_EXTERNA,
  useApp,
} from "@/contexto/AppContexto";
import { formatearFechaHora, formatearNumero } from "@/lib/formato";

export const Route = createFileRoute("/parametros")({
  head: () => ({
    meta: [
      { title: "Parámetros | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Parámetros generales del sistema: tipo de cambio con historial y responsable, y opciones de integración.",
      },
      { property: "og:title", content: "Parámetros | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Parámetros generales del sistema de flujo de efectivo.",
      },
    ],
  }),
  component: PaginaParametros,
});

function PaginaParametros() {
  const {
    tipoCambio,
    tiposCambio,
    esAdministrador,
    registrarTipoCambio,
    bitacora,
    modoApi,
    pedidosFuenteExterna,
    facturasFuenteExterna,
    pedidosFuenteOrigen,
    parametros,
    actualizarParametro,
  } = useApp();
  const [valor, setValor] = useState(String(tipoCambio));
  const [nota, setNota] = useState("");

  const cambiarPedidosExternos = (activo: boolean) => {
    actualizarParametro(PARAM_PEDIDOS_FUENTE_EXTERNA, activo ? "1" : "0");
    if (activo && !parametros[PARAM_PEDIDOS_FUENTE_ORIGEN]) {
      actualizarParametro(PARAM_PEDIDOS_FUENTE_ORIGEN, FUENTE_PEDIDOS_DEFECTO);
    }
    toast.success(
      activo
        ? "Los pedidos se tomarán de la fuente externa (SoftlandERP)."
        : "Los pedidos se tomarán del registro interno.",
    );
  };


  const cambiarFacturasExternas = (activo: boolean) => {
    actualizarParametro(PARAM_FACTURAS_FUENTE_EXTERNA, activo ? "1" : "0");
    if (activo && !parametros[PARAM_PEDIDOS_FUENTE_ORIGEN]) {
      actualizarParametro(PARAM_PEDIDOS_FUENTE_ORIGEN, FUENTE_PEDIDOS_DEFECTO);
    }
    toast.success(
      activo
        ? "Las facturas se tomarán de la fuente externa (SoftlandERP)."
        : "Las facturas se tomarán del registro interno.",
    );
  };

  const algunaFuenteExterna = pedidosFuenteExterna || facturasFuenteExterna;

  const guardar = () => {
    const numero = Number(valor);
    if (!(numero > 0)) {
      toast.error("El tipo de cambio debe ser un número mayor que cero.");
      return;
    }
    registrarTipoCambio(numero, nota.trim() || undefined);
    setNota("");
    toast.success(`Tipo de cambio actualizado a ₡${formatearNumero(numero)}`);
  };

  const movimientos = bitacora.filter((b) => b.modulo === "Parámetros").slice(0, 15);

  const historial = [...tiposCambio].reverse();

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Parámetros"
        requerimiento="RF-007"
        descripcion="Parámetros generales del sistema. El tipo de cambio se ingresa manualmente; el sistema conserva el historial de valores con fecha y responsable, y usa el último valor para las conversiones."
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Integración</h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="pedidos-externos">Usar datos de pedidos de fuente externa</Label>
            <p className="text-xs text-muted-foreground">
              Se guarda en la base de datos y cada cambio queda en la bitácora. Solo el
              administrador puede modificarlo.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{pedidosFuenteExterna ? "Sí" : "No"}</span>
            <Switch
              id="pedidos-externos"
              checked={pedidosFuenteExterna}
              onCheckedChange={cambiarPedidosExternos}
              disabled={!esAdministrador}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="facturas-externas">Usar datos de facturas de fuente externa</Label>
            <p className="text-xs text-muted-foreground">
              Las facturas se leen de las tablas FACTURA y FACTURA_LINEA del sistema externo,
              usando la misma fuente y conexión que los pedidos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{facturasFuenteExterna ? "Sí" : "No"}</span>
            <Switch
              id="facturas-externas"
              checked={facturasFuenteExterna}
              onCheckedChange={cambiarFacturasExternas}
              disabled={!esAdministrador}
            />
          </div>
        </div>
        <div
          className={`mt-4 flex flex-wrap items-center justify-between gap-3 border-l-2 border-border pl-4 ${
            algunaFuenteExterna ? "" : "opacity-50"
          }`}
        >
          <div className="space-y-0.5">
            <Label htmlFor="fuente-pedidos">Fuente externa (pedidos y facturas)</Label>
            <p className="text-xs text-muted-foreground">
              Sistema externo del que se consultan los pedidos y las facturas. Disponible cuando
              alguna de las opciones anteriores está en Sí.
            </p>
          </div>
          <Select
            value={pedidosFuenteOrigen}
            onValueChange={(v) => {
              actualizarParametro(PARAM_PEDIDOS_FUENTE_ORIGEN, v);
              toast.success(`Fuente externa: ${v}`);
            }}
            disabled={!algunaFuenteExterna || !esAdministrador}
          >
            <SelectTrigger id="fuente-pedidos" className="w-56">
              <SelectValue placeholder="Seleccione la fuente" />
            </SelectTrigger>
            <SelectContent>
              {FUENTES_PEDIDOS.map((f) => (
                <SelectItem key={f.valor} value={f.valor}>
                  {f.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {pedidosFuenteOrigen === "SoftlandERP" ? (
          <ConexionSoftland habilitado={algunaFuenteExterna} />
        ) : null}
      </div>

      <h2 className="text-sm font-semibold text-foreground">Tipo de cambio</h2>


      <div className="grid gap-3 md:grid-cols-3">
        <TarjetaIndicador
          titulo="Tipo de cambio vigente"
          valor={`₡${formatearNumero(tipoCambio)}`}
          detalle="Colones por dólar"
          tono="primario"
        />
        <TarjetaIndicador
          titulo="Cambios registrados"
          valor={String(tiposCambio.length)}
          detalle="Historial de la sesión"
        />
        <TarjetaIndicador
          titulo="Último responsable"
          valor={historial[0]?.usuario ?? "—"}
          detalle={historial[0] ? formatearFechaHora(historial[0].fecha) : ""}
        />
      </div>

      {esAdministrador ? (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="tc">Nuevo tipo de cambio</Label>
            <Input
              id="tc"
              type="number"
              step="0.01"
              className="w-48"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivo">Motivo del cambio (opcional)</Label>
            <Input
              id="motivo"
              className="w-72"
              placeholder="Ej. Tipo de cambio de venta BCCR"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>
          <Button onClick={guardar}>Registrar tipo de cambio</Button>
        </div>
      ) : (
        <p className="rounded-md border border-advertencia/40 bg-advertencia-suave px-4 py-3 text-sm text-advertencia-foreground">
          Solo el perfil administrador puede modificar el tipo de cambio.
        </p>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Valor (₡ por US$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historial.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap">{formatearFechaHora(t.fecha)}</TableCell>
                <TableCell>{t.usuario}</TableCell>
                <TableCell className="text-muted-foreground">{t.nota ?? "—"}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearNumero(t.valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">
          Bitácora del parámetro {modoApi ? "(SQL Server)" : "(modo demostración)"}
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha y hora</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead>Valor anterior</TableHead>
                <TableHead>Valor nuevo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Sin movimientos registrados.
                  </TableCell>
                </TableRow>
              ) : (
                movimientos.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatearFechaHora(b.fechaHora)}
                    </TableCell>
                    <TableCell>{b.usuario}</TableCell>
                    <TableCell>{b.operacion}</TableCell>
                    <TableCell className="font-mono tabular-nums">{b.valorAnterior ?? "—"}</TableCell>
                    <TableCell className="font-mono tabular-nums">{b.valorNuevo ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
