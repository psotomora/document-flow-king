import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaIndicador } from "@/components/comunes/TarjetaIndicador";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const CLAVE_PEDIDOS_EXTERNOS = "aplix.param.pedidosFuenteExterna";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/contexto/AppContexto";
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
  const { tipoCambio, tiposCambio, esAdministrador, registrarTipoCambio, bitacora, modoApi } =
    useApp();
  const [valor, setValor] = useState(String(tipoCambio));
  const [nota, setNota] = useState("");
  const [pedidosExternos, setPedidosExternos] = useState(false);

  useEffect(() => {
    setPedidosExternos(window.localStorage.getItem(CLAVE_PEDIDOS_EXTERNOS) === "1");
  }, []);

  const cambiarPedidosExternos = (activo: boolean) => {
    setPedidosExternos(activo);
    window.localStorage.setItem(CLAVE_PEDIDOS_EXTERNOS, activo ? "1" : "0");
  };


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
        titulo="Tipo de cambio"
        requerimiento="RF-007"
        descripcion="El tipo de cambio se ingresa manualmente. El sistema conserva el historial de valores con fecha y responsable, y usa el último valor para las conversiones."
      />

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
