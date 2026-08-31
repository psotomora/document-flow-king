import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaIndicador } from "@/components/comunes/TarjetaIndicador";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      { title: "Tipo de cambio | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Registro manual del tipo de cambio de colones a dólares con historial de valores y responsable del cambio.",
      },
      { property: "og:title", content: "Tipo de cambio | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Parámetro usado para consolidar saldos en dólares.",
      },
    ],
  }),
  component: PaginaParametros,
});

function PaginaParametros() {
  const { tipoCambio, tiposCambio, esAdministrador, registrarTipoCambio } = useApp();
  const [valor, setValor] = useState(String(tipoCambio));

  const guardar = () => {
    const numero = Number(valor);
    if (!(numero > 0)) {
      toast.error("El tipo de cambio debe ser un número mayor que cero.");
      return;
    }
    registrarTipoCambio(numero);
    toast.success(`Tipo de cambio actualizado a ₡${formatearNumero(numero)}`);
  };

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
              <TableHead className="text-right">Valor (₡ por US$)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historial.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="whitespace-nowrap">{formatearFechaHora(t.fecha)}</TableCell>
                <TableCell>{t.usuario}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatearNumero(t.valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
