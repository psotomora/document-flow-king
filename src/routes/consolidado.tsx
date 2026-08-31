import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, FileDown } from "lucide-react";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { TarjetaIndicador } from "@/components/comunes/TarjetaIndicador";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { filtrarPorCompania, useApp } from "@/contexto/AppContexto";
import { calcularSaldoProyectado, calcularSaldosPorBanco } from "@/lib/calculos";
import { formatearFecha, formatearMoneda, formatearNumero } from "@/lib/formato";
import { exportarPdf } from "@/lib/exportar";

export const Route = createFileRoute("/consolidado")({
  head: () => ({
    meta: [
      { title: "Saldo proyectado consolidado | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Saldo bancario disponible más cuentas por cobrar, con equivalencia de colones a dólares al tipo de cambio vigente.",
      },
      { property: "og:title", content: "Saldo proyectado consolidado | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Visión única del efectivo esperado en dólares para THERONIX y APLIX.",
      },
    ],
  }),
  component: PaginaConsolidado,
});

function PaginaConsolidado() {
  const {
    bancos,
    pagos,
    erogaciones,
    facturasCalculadas,
    pedidos,
    companiaActiva,
    tipoCambio,
    hoy,
    usuario,
  } = useApp();

  const proyeccion = useMemo(() => {
    const bancosVisibles = filtrarPorCompania(bancos, companiaActiva).filter((b) => b.activo);
    return calcularSaldoProyectado(
      calcularSaldosPorBanco(bancosVisibles, pagos, erogaciones, "USD"),
      calcularSaldosPorBanco(bancosVisibles, pagos, erogaciones, "CRC"),
      filtrarPorCompania(facturasCalculadas, companiaActiva),
      filtrarPorCompania(pedidos, companiaActiva),
      tipoCambio,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancos, pagos, erogaciones, facturasCalculadas, pedidos, companiaActiva, tipoCambio]);

  const filas: [string, string, string][] = [
    [
      "Saldo bancario disponible",
      formatearMoneda(proyeccion.saldoActualUSD, "USD"),
      formatearMoneda(proyeccion.saldoActualCRC, "CRC"),
    ],
    [
      "Facturas por cobrar",
      formatearMoneda(proyeccion.porCobrarUSD, "USD"),
      formatearMoneda(proyeccion.porCobrarCRC, "CRC"),
    ],
    [
      "Saldo proyectado por moneda",
      formatearMoneda(proyeccion.proyectadoUSD, "USD"),
      formatearMoneda(proyeccion.proyectadoCRC, "CRC"),
    ],
  ];

  const exportar = () =>
    exportarPdf(
      "saldo-proyectado-consolidado",
      "Saldo proyectado consolidado",
      `Fecha de corte: ${formatearFecha(hoy)} · Tipo de cambio: ${formatearNumero(tipoCambio)}`,
      ["Concepto", "Dólares (USD)", "Colones (CRC)"],
      [
        ...filas,
        ["Equivalente en USD de los colones", formatearMoneda(proyeccion.equivalenteUsdDeCrc, "USD"), "—"],
        ["Consolidado en USD", formatearMoneda(proyeccion.consolidadoUSD, "USD"), "—"],
        ["Pedidos pendientes (USD)", formatearMoneda(proyeccion.pedidosPendientesUSD, "USD"), "—"],
        [
          "Consolidado incluyendo pedidos",
          formatearMoneda(proyeccion.consolidadoConPedidosUSD, "USD"),
          "—",
        ],
      ],
      usuario.nombre,
    );

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Saldo proyectado consolidado"
        requerimiento="RF-009"
        descripcion="Saldo proyectado = saldo bancario disponible + facturas por cobrar. Para consolidar en dólares, los colones se convierten con el tipo de cambio vigente; el detalle por moneda se conserva."
        acciones={
          <Button variant="outline" size="sm" onClick={exportar} className="gap-1.5">
            <FileDown className="size-4" /> Exportar PDF
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <TarjetaIndicador
          titulo="Proyectado en dólares"
          valor={formatearMoneda(proyeccion.proyectadoUSD, "USD")}
          detalle="Bancos USD + cuentas por cobrar USD"
        />
        <TarjetaIndicador
          titulo="Proyectado en colones"
          valor={formatearMoneda(proyeccion.proyectadoCRC, "CRC")}
          detalle={`Equivale a ${formatearMoneda(proyeccion.equivalenteUsdDeCrc, "USD")}`}
        />
        <TarjetaIndicador
          titulo="Consolidado en USD"
          valor={formatearMoneda(proyeccion.consolidadoUSD, "USD")}
          detalle={`Tipo de cambio ₡${formatearNumero(tipoCambio)}`}
          tono="primario"
        />
        <TarjetaIndicador
          titulo="Con pedidos pendientes"
          valor={formatearMoneda(proyeccion.consolidadoConPedidosUSD, "USD")}
          detalle={`Incluye ${formatearMoneda(proyeccion.pedidosPendientesUSD, "USD")} en pedidos`}
          tono="exito"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Dólares (USD)</TableHead>
              <TableHead className="text-right">Colones (CRC)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.map(([concepto, usd, crc]) => (
              <TableRow key={concepto}>
                <TableCell className="font-medium">{concepto}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{usd}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{crc}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium">Cómo se llega al consolidado</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Paso
            titulo="Proyectado USD"
            valor={formatearMoneda(proyeccion.proyectadoUSD, "USD")}
          />
          <span className="text-muted-foreground">+</span>
          <Paso
            titulo="Colones convertidos"
            valor={formatearMoneda(proyeccion.equivalenteUsdDeCrc, "USD")}
          />
          <ArrowRight className="size-4 text-muted-foreground" />
          <Paso
            titulo="Consolidado"
            valor={formatearMoneda(proyeccion.consolidadoUSD, "USD")}
            resaltado
          />
          <span className="text-muted-foreground">+</span>
          <Paso
            titulo="Pedidos pendientes"
            valor={formatearMoneda(proyeccion.pedidosPendientesUSD, "USD")}
          />
          <ArrowRight className="size-4 text-muted-foreground" />
          <Paso
            titulo="Con pedidos"
            valor={formatearMoneda(proyeccion.consolidadoConPedidosUSD, "USD")}
            resaltado
          />
        </div>
      </div>
    </div>
  );
}

function Paso({
  titulo,
  valor,
  resaltado = false,
}: {
  titulo: string;
  valor: string;
  resaltado?: boolean;
}) {
  return (
    <div
      className={
        resaltado
          ? "rounded-md border border-primary/30 bg-primary/10 px-3 py-2"
          : "rounded-md border border-border bg-muted px-3 py-2"
      }
    >
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className="font-mono font-semibold tabular-nums">{valor}</p>
    </div>
  );
}
