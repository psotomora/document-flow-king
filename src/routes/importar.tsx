import { createFileRoute } from "@tanstack/react-router";
import { useState, type ChangeEvent } from "react";
import { CheckCircle2, Download, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/contexto/AppContexto";
import type { Factura, Moneda } from "@/data/tipos";
import { formatearMoneda } from "@/lib/formato";
import { exportarExcel } from "@/lib/exportar";

export const Route = createFileRoute("/importar")({
  head: () => ({
    meta: [
      { title: "Carga inicial desde Excel | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Asistente de carga inicial de facturas desde un archivo Excel, con validación previa antes de incorporar los datos.",
      },
      { property: "og:title", content: "Carga inicial desde Excel | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Migración del control actual en Excel hacia el sistema.",
      },
    ],
  }),
  component: PaginaImportar,
});

interface FilaImportada {
  fila: number;
  datos: Omit<Factura, "id"> | null;
  errores: string[];
  crudo: Record<string, unknown>;
}

const COLUMNAS = [
  "Compania",
  "Numero",
  "Cliente",
  "FechaEmision",
  "PlazoDias",
  "Moneda",
  "Monto",
];

function PaginaImportar() {
  const { companias, importarLote, puedeEditar, usuario } = useApp();
  const [filas, setFilas] = useState<FilaImportada[]>([]);
  const [archivo, setArchivo] = useState("");

  const validas = filas.filter((f) => f.datos && f.errores.length === 0);
  const invalidas = filas.filter((f) => f.errores.length > 0);

  const plantilla = () =>
    exportarExcel(
      "plantilla-carga-inicial",
      "Facturas",
      [
        {
          Compania: "THERONIX",
          Numero: "F-1001",
          Cliente: "Cliente de ejemplo",
          FechaEmision: "2026-08-01",
          PlazoDias: 30,
          Moneda: "USD",
          Monto: 1500,
        },
      ],
      usuario.nombre,
    );

  const leerArchivo = async (evento: ChangeEvent<HTMLInputElement>) => {
    const file = evento.target.files?.[0];
    if (!file) return;
    setArchivo(file.name);
    const XLSX = await import("xlsx");
    const buffer = await file.arrayBuffer();
    const libro = XLSX.read(buffer, { type: "array" });
    const nombreHoja = libro.SheetNames[0];
    const hoja = nombreHoja ? libro.Sheets[nombreHoja] : undefined;
    if (!hoja) {
      toast.error("El archivo no contiene hojas legibles.");
      return;
    }
    const crudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(hoja, { defval: "" });

    const resultado: FilaImportada[] = crudas.map((cruda, indice) => {
      const errores: string[] = [];
      const codigo = String(cruda["Compania"] ?? "").trim().toUpperCase();
      const compania = companias.find((c) => c.codigo.toUpperCase() === codigo);
      if (!compania) errores.push("Compañía no reconocida");

      const numero = String(cruda["Numero"] ?? "").trim();
      if (!numero) errores.push("Número de factura vacío");

      const cliente = String(cruda["Cliente"] ?? "").trim();
      if (!cliente) errores.push("Cliente vacío");

      const fechaEmision = String(cruda["FechaEmision"] ?? "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaEmision))
        errores.push("Fecha de emisión inválida (use AAAA-MM-DD)");

      const plazoDias = Number(cruda["PlazoDias"]);
      if (!Number.isFinite(plazoDias) || plazoDias < 0) errores.push("Plazo inválido");

      const moneda = String(cruda["Moneda"] ?? "").trim().toUpperCase() as Moneda;
      if (moneda !== "USD" && moneda !== "CRC") errores.push("Moneda debe ser USD o CRC");

      const monto = Number(cruda["Monto"]);
      if (!Number.isFinite(monto) || monto <= 0) errores.push("Monto inválido");

      return {
        fila: indice + 2,
        crudo: cruda,
        errores,
        datos:
          errores.length === 0 && compania
            ? {
                companiaId: compania.id,
                numero,
                cliente,
                fechaEmision,
                plazoDias,
                moneda,
                monto,
              }
            : null,
      };
    });

    setFilas(resultado);
    toast.success(`Archivo analizado: ${resultado.length} filas leídas`);
  };

  const confirmar = () => {
    const nuevas = validas.map((f) => f.datos!) as Omit<Factura, "id">[];
    if (!nuevas.length) {
      toast.error("No hay filas válidas para importar.");
      return;
    }
    importarLote({ facturas: nuevas });
    toast.success(`${nuevas.length} facturas incorporadas`);
    setFilas([]);
    setArchivo("");
  };

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Carga inicial desde Excel"
        requerimiento="RF-018"
        descripcion="Cargue el archivo de facturas, revise el resultado de la validación y confirme la incorporación. Las filas con errores no se importan."
        acciones={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={plantilla}>
            <Download className="size-4" /> Descargar plantilla
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium">Paso 1. Seleccione el archivo</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Columnas esperadas: {COLUMNAS.join(", ")}.
        </p>
        <label className="mt-4 flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/50 px-4 py-10 text-center transition-colors hover:bg-muted">
          <Upload className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium">
            {archivo || "Haga clic para elegir un archivo .xlsx o .csv"}
          </span>
          <span className="text-xs text-muted-foreground">
            El archivo se procesa en su navegador; no se envía a ningún servidor.
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={leerArchivo}
          />
        </label>
      </div>

      {filas.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground uppercase">Filas leídas</p>
              <p className="font-mono text-xl font-semibold tabular-nums">{filas.length}</p>
            </div>
            <div className="rounded-lg border border-exito/30 bg-exito-suave p-4">
              <p className="flex items-center gap-1.5 text-xs text-exito uppercase">
                <CheckCircle2 className="size-3.5" /> Válidas
              </p>
              <p className="font-mono text-xl font-semibold tabular-nums text-exito">
                {validas.length}
              </p>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive-suave p-4">
              <p className="flex items-center gap-1.5 text-xs text-destructive uppercase">
                <TriangleAlert className="size-3.5" /> Con errores
              </p>
              <p className="font-mono text-xl font-semibold tabular-nums text-destructive">
                {invalidas.length}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Emisión</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.fila}>
                    <TableCell className="tabular-nums">{f.fila}</TableCell>
                    <TableCell className="font-medium">
                      {String(f.crudo["Numero"] ?? "—")}
                    </TableCell>
                    <TableCell>{String(f.crudo["Cliente"] ?? "—")}</TableCell>
                    <TableCell>{String(f.crudo["FechaEmision"] ?? "—")}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {f.datos ? formatearMoneda(f.datos.monto, f.datos.moneda) : "—"}
                    </TableCell>
                    <TableCell>
                      {f.errores.length ? (
                        <span className="text-sm text-destructive">{f.errores.join("; ")}</span>
                      ) : (
                        <span className="text-sm text-exito">Lista para importar</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setFilas([])}>
              Descartar
            </Button>
            <Button onClick={confirmar} disabled={!puedeEditar || validas.length === 0}>
              Importar {validas.length} facturas
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
