import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
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
import { useApp } from "@/contexto/AppContexto";
import { formatearFechaHora } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/bitacora")({
  head: () => ({
    meta: [
      { title: "Bitácora de auditoría | Flujo de Efectivo Aplix" },
      {
        name: "description",
        content:
          "Registro de creaciones, modificaciones y eliminaciones con usuario, módulo y fecha y hora.",
      },
      { property: "og:title", content: "Bitácora de auditoría | Flujo de Efectivo Aplix" },
      {
        property: "og:description",
        content: "Trazabilidad de las operaciones realizadas en el sistema.",
      },
    ],
  }),
  component: PaginaBitacora,
});

function PaginaBitacora() {
  const { bitacora, usuario } = useApp();
  const [modulo, setModulo] = useState("todos");
  const [operacion, setOperacion] = useState("todas");
  const [texto, setTexto] = useState("");

  const modulos = useMemo(() => [...new Set(bitacora.map((b) => b.modulo))], [bitacora]);

  const filtrada = bitacora.filter((b) => {
    if (modulo !== "todos" && b.modulo !== modulo) return false;
    if (operacion !== "todas" && b.operacion !== operacion) return false;
    if (texto) {
      const q = texto.toLowerCase();
      if (!b.registro.toLowerCase().includes(q) && !b.usuario.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  const exportar = () =>
    exportarExcel(
      "bitacora",
      "Bitácora",
      filtrada.map((b) => ({
        "Fecha y hora": formatearFechaHora(b.fechaHora),
        Usuario: b.usuario,
        Módulo: b.modulo,
        Registro: b.registro,
        Operación: b.operacion,
        "Valor anterior": b.valorAnterior ?? "",
        "Valor nuevo": b.valorNuevo ?? "",
      })),
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Bitácora de auditoría"
        requerimiento="RF-016"
        descripcion="Toda creación, modificación o eliminación queda registrada con usuario, módulo, fecha y hora. Los registros de la bitácora no se pueden editar ni borrar."
        acciones={
          <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
            <FileDown className="size-4" /> Exportar Excel
          </Button>
        }
      />

      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Módulo</Label>
          <Select value={modulo} onValueChange={setModulo}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {modulos.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Operación</Label>
          <Select value={operacion} onValueChange={setOperacion}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="Creación">Creación</SelectItem>
              <SelectItem value="Modificación">Modificación</SelectItem>
              <SelectItem value="Eliminación">Eliminación</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-texto">Buscar</Label>
          <Input
            id="b-texto"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Registro o usuario"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y hora</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead>Operación</TableHead>
              <TableHead>Valor anterior</TableHead>
              <TableHead>Valor nuevo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrada.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="whitespace-nowrap">
                  {formatearFechaHora(b.fechaHora)}
                </TableCell>
                <TableCell>{b.usuario}</TableCell>
                <TableCell>{b.modulo}</TableCell>
                <TableCell className="font-medium">{b.registro}</TableCell>
                <TableCell>{b.operacion}</TableCell>
                <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                  {b.valorAnterior ?? "—"}
                </TableCell>
                <TableCell className="max-w-[16rem] truncate text-muted-foreground">
                  {b.valorNuevo ?? "—"}
                </TableCell>
              </TableRow>
            ))}
            {filtrada.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No hay movimientos que coincidan con los filtros.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
