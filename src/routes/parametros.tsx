import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { SelectorFilas } from "@/components/comunes/SelectorFilas";
import { useFilasGlobales } from "@/lib/preferencias";
import { urlApi } from "@/lib/api";
import { APP_VERSION } from "@/lib/version";
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
import { ServidorCorreo } from "@/components/parametros/ServidorCorreo";
import {
  FUENTES_PEDIDOS,
  FUENTE_PEDIDOS_DEFECTO,
  PARAM_PEDIDOS_FUENTE_EXTERNA,
  PARAM_PEDIDOS_FUENTE_ORIGEN,
  PARAM_FACTURAS_FUENTE_EXTERNA,
  PARAM_DOCUMENTOS_PAGO_FUENTE_EXTERNA,
  PARAM_DOCUMENTOS_COBRO_FUENTE_EXTERNA,
  PARAM_CONTRATOS_FUENTE_EXTERNA,
  PARAM_CONTRATOS_MES_LIMPIAR,
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
  const { filas: filasGlobales, establecer: establecerFilasGlobales } = useFilasGlobales();
  const {
    tipoCambio,
    tiposCambio,
    esAdministrador,
    perfil,
    usuario,
    errorApi,
    avisoFuenteExterna,
    registrarTipoCambio,
    bitacora,
    modoApi,
    pedidosFuenteExterna,
    facturasFuenteExterna,
    documentosPagoFuenteExterna,
    documentosCobroFuenteExterna,
    contratosFuenteExterna,
    contratosMesLimpiar,
    pedidosFuenteOrigen,
    parametros,
    actualizarParametro,
  } = useApp();
  const [valor, setValor] = useState(String(tipoCambio));
  const [nota, setNota] = useState("");
  const [versionApi, setVersionApi] = useState<string | null>(null);

  // Lee la versión expuesta por la API en /api/salud.
  useEffect(() => {
    const base = urlApi();
    if (!base) {
      setVersionApi(null);
      return;
    }
    const ctrl = new AbortController();
    fetch(`${base}/salud`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const texto = await r.text();
        let datos: { versionApi?: string } | null = null;
        try {
          datos = JSON.parse(texto) as { versionApi?: string };
        } catch {
          datos = null;
        }
        setVersionApi(
          datos?.versionApi ??
            r.headers.get("X-FlujoEfectivo-Api-Version") ??
            null,
        );
      })
      .catch(() => setVersionApi(null));
    return () => ctrl.abort();
  }, []);

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

  const cambiarDocumentosPagoExternos = (activo: boolean) => {
    actualizarParametro(PARAM_DOCUMENTOS_PAGO_FUENTE_EXTERNA, activo ? "1" : "0");
    if (activo && !parametros[PARAM_PEDIDOS_FUENTE_ORIGEN]) {
      actualizarParametro(PARAM_PEDIDOS_FUENTE_ORIGEN, FUENTE_PEDIDOS_DEFECTO);
    }
    toast.success(
      activo
        ? "Los documentos por pagar se tomarán de la fuente externa (SoftlandERP)."
        : "Los documentos por pagar se tomarán del registro interno.",
    );
  };

  const cambiarDocumentosCobroExternos = (activo: boolean) => {
    actualizarParametro(PARAM_DOCUMENTOS_COBRO_FUENTE_EXTERNA, activo ? "1" : "0");
    if (activo && !parametros[PARAM_PEDIDOS_FUENTE_ORIGEN]) {
      actualizarParametro(PARAM_PEDIDOS_FUENTE_ORIGEN, FUENTE_PEDIDOS_DEFECTO);
    }
    toast.success(
      activo
        ? "Los documentos por cobrar se tomarán de la fuente externa (SoftlandERP)."
        : "Los documentos por cobrar se tomarán del registro interno.",
    );
  };

  const cambiarContratosExternos = (activo: boolean) => {
    actualizarParametro(PARAM_CONTRATOS_FUENTE_EXTERNA, activo ? "1" : "0");
    if (activo && !parametros[PARAM_PEDIDOS_FUENTE_ORIGEN]) {
      actualizarParametro(PARAM_PEDIDOS_FUENTE_ORIGEN, FUENTE_PEDIDOS_DEFECTO);
    }
    toast.success(
      activo
        ? "Los contratos se tomarán de la fuente externa (SoftlandERP)."
        : "Los contratos se tomarán del registro interno.",
    );
  };

  const cambiarLimpiezaMensual = (activo: boolean) => {
    actualizarParametro(PARAM_CONTRATOS_MES_LIMPIAR, activo ? "1" : "0");
    toast.success(
      activo
        ? "Al cambio de mes los contratos del mes anterior pasarán al histórico."
        : "Los contratos del mes se mantendrán en la lista principal.",
    );
  };


  const algunaFuenteExterna =
    pedidosFuenteExterna ||
    facturasFuenteExterna ||
    documentosPagoFuenteExterna ||
    documentosCobroFuenteExterna ||
    contratosFuenteExterna;

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

      {!esAdministrador ? (
        <div className="rounded-lg border border-advertencia/40 bg-advertencia-suave p-3 text-sm text-advertencia-foreground">
          <p className="font-medium">Esta pantalla está en modo solo lectura.</p>
          <p className="text-xs">
            El usuario {usuario.nombre} tiene el perfil "{perfil}". Solo el perfil administrador
            puede modificar los parámetros y la conexión a la fuente externa.
          </p>
        </div>
      ) : null}

      {errorApi ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">No fue posible obtener los datos del servidor.</p>
          <p className="text-xs break-words">{errorApi}</p>
        </div>
      ) : null}

      {avisoFuenteExterna ? (
        <div className="rounded-lg border border-advertencia/40 bg-advertencia-suave p-3 text-sm text-advertencia-foreground">
          <p className="font-medium">Aviso de la fuente externa</p>
          <p className="text-xs break-words">{avisoFuenteExterna}</p>
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Integración</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Versión de la Aplicación: {APP_VERSION} · Versión de la API:{" "}
          {versionApi ?? "No detectada"}
        </p>
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="documentos-pago-externos">
              Usar datos de documentos pendientes de pago de fuente externa
            </Label>
            <p className="text-xs text-muted-foreground">
              Los documentos por pagar se leen de la tabla DOCUMENTOS_CP del sistema externo, con la
              misma conexión de pedidos y facturas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {documentosPagoFuenteExterna ? "Sí" : "No"}
            </span>
            <Switch
              id="documentos-pago-externos"
              checked={documentosPagoFuenteExterna}
              onCheckedChange={cambiarDocumentosPagoExternos}
              disabled={!esAdministrador}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="documentos-cobro-externos">
              Usar datos para reporte de documentos de fuente externa
            </Label>
            <p className="text-xs text-muted-foreground">
              Los documentos por cobrar (tipos FAC y DEV) se leen de la tabla DOCUMENTOS_CC del
              sistema externo, con la misma conexión de pedidos y facturas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {documentosCobroFuenteExterna ? "Sí" : "No"}
            </span>
            <Switch
              id="documentos-cobro-externos"
              checked={documentosCobroFuenteExterna}
              onCheckedChange={cambiarDocumentosCobroExternos}
              disabled={!esAdministrador}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="contratos-externos">
              Usar datos de contratos de fuente externa
            </Label>
            <p className="text-xs text-muted-foreground">
              Los contratos recurrentes y sus líneas se leen de las tablas CONTRATO y
              CONTRATO_LINEA del sistema externo, con la misma conexión de pedidos y facturas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {contratosFuenteExterna ? "Sí" : "No"}
            </span>
            <Switch
              id="contratos-externos"
              checked={contratosFuenteExterna}
              onCheckedChange={cambiarContratosExternos}
              disabled={!esAdministrador}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <Label htmlFor="contratos-mes-limpiar">
              Limpiar los contratos del mes al cambio de mes
            </Label>
            <p className="text-xs text-muted-foreground">
              Si está en Sí, al primer ingreso de un mes nuevo los contratos del mes anterior se
              guardan en el histórico y la lista principal queda solo con los del mes corriente. Si
              está en No, todo se mantiene en la lista principal.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {contratosMesLimpiar ? "Sí" : "No"}
            </span>
            <Switch
              id="contratos-mes-limpiar"
              checked={contratosMesLimpiar}
              onCheckedChange={cambiarLimpiezaMensual}
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
          <>
            <ConexionSoftland
              habilitado={algunaFuenteExterna}
              fuente="softland"
              titulo="Conexión 1 a fuente externa"
            />
            <ConexionSoftland
              habilitado={algunaFuenteExterna}
              fuente="softland2"
              titulo="Conexión 2 a fuente externa"
            />
          </>
        ) : null}
      </div>

      <ServidorCorreo />

      <h2 className="text-sm font-semibold text-foreground">Presentación de tablas</h2>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Filas visibles en tablas</p>
          <p className="text-xs text-muted-foreground">
            Cantidad de filas que se muestran sin desplazarse. Aplica a todas las tablas y se
            guarda para su usuario; cada pantalla puede cambiarlo por separado.
          </p>
        </div>
        <div className="ml-auto">
          <SelectorFilas
            id="filas-global"
            etiqueta="Filas"
            filas={filasGlobales}
            onCambio={establecerFilasGlobales}
          />
        </div>
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
