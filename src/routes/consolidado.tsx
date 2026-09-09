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
    pedidosFuenteExterna,
    facturasFuenteExterna,
    contratosDelMes,
  } = useApp();

  const origenPedidos = pedidosFuenteExterna ? "SoftlandERP" : "registro local";
  const origenFacturas = facturasFuenteExterna ? "SoftlandERP" : "registro local";

  // Contratos del mes que aún no tienen pedido ni factura, en dólares.
  const contratosMesUSD = useMemo(() => {
    const pendientes = filtrarPorCompania(contratosDelMes, companiaActiva).filter(
      (c) => !c.yaDocumentado,
    );
    return (
      pendientes.filter((c) => c.moneda === "USD").reduce((s, c) => s + c.monto, 0) +
      (tipoCambio > 0
        ? pendientes.filter((c) => c.moneda === "CRC").reduce((s, c) => s + c.monto, 0) / tipoCambio
        : 0)
    );
  }, [contratosDelMes, companiaActiva, tipoCambio]);

  const proyeccion = useMemo(() => {
    const bancosVisibles = filtrarPorCompania(bancos, companiaActiva).filter((b) => b.activo);
    return calcularSaldoProyectado(
      calcularSaldosPorBanco(bancosVisibles, pagos, erogaciones, "USD"),
      calcularSaldosPorBanco(bancosVisibles, pagos, erogaciones, "CRC"),
      filtrarPorCompania(facturasCalculadas, companiaActiva),
      filtrarPorCompania(pedidos, companiaActiva),
      tipoCambio,
      contratosMesUSD,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bancos, pagos, erogaciones, facturasCalculadas, pedidos, companiaActiva, tipoCambio, contratosMesUSD]);

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
    [
      "Pedidos pendientes",
      formatearMoneda(proyeccion.pedidosPendientesUSD, "USD"),
      "—",
    ],
    [
      "Contratos por facturar este mes",
      formatearMoneda(proyeccion.contratosMesUSD, "USD"),
      "—",
    ],
  ];

  const filaTotal: [string, string, string] = [
    "Saldo proyectado total (USD)",
    formatearMoneda(proyeccion.saldoProyectadoTotalUSD, "USD"),
    "—",
  ];

  const bancosEnUsd =
    proyeccion.saldoActualUSD + (tipoCambio > 0 ? proyeccion.saldoActualCRC / tipoCambio : 0);
  const facturasPendientesEnUsd =
    proyeccion.porCobrarUSD + (tipoCambio > 0 ? proyeccion.porCobrarCRC / tipoCambio : 0);

  const desglose: { concepto: string; valor: number; nota: string }[] = [
    {
      concepto: "Saldo en bancos",
      valor: bancosEnUsd,
      nota: "Saldo inicial + pagos recibidos − erogaciones (colones convertidos a dólares).",
    },
    {
      concepto: "Facturas pendientes de cobro",
      valor: facturasPendientesEnUsd,
      nota: "Solo el saldo sin pagar de cada factura: las ya cobradas aportan cero porque su dinero ya está en el banco.",
    },
    {
      concepto: "Pedidos pendientes",
      valor: proyeccion.pedidosPendientesUSD,
      nota: `Solo pedidos en estado Pendiente (${origenPedidos}); al facturarse dejan de contarse aquí.`,
    },
    {
      concepto: "Contratos por facturar este mes",
      valor: proyeccion.contratosMesUSD,
      nota: "Contratos activos cuya facturación cae en el mes corriente y que aún no tienen pedido ni factura; los que ya se documentaron no se cuentan otra vez.",
    },
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
        filaTotal,
        ["Cómo se compone el saldo proyectado", "", ""],
        ...desglose.map(
          (d) => [d.concepto, formatearMoneda(d.valor, "USD"), "—"] as [string, string, string],
        ),
        [
          "Total proyectado (USD)",
          formatearMoneda(proyeccion.saldoProyectadoTotalUSD, "USD"),
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
        <TarjetaIndicador
          titulo="Contratos por facturar este mes"
          valor={formatearMoneda(proyeccion.contratosMesUSD, "USD")}
          detalle="Contratos activos del mes corriente aún sin pedido ni factura"
        />
        <TarjetaIndicador
          titulo="Saldo proyectado total (USD)"
          valor={formatearMoneda(proyeccion.saldoProyectadoTotalUSD, "USD")}
          detalle={`Bancos + pedidos pendientes (${origenPedidos}) + facturas pendientes de pago (${origenFacturas}) + contratos por facturar del mes`}
          tono="primario"
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
            <TableRow className="bg-primary/5">
              <TableCell className="font-semibold">{filaTotal[0]}</TableCell>
              <TableCell className="text-right font-mono font-semibold tabular-nums">
                {filaTotal[1]}
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{filaTotal[2]}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-sm font-medium">Cómo se compone el saldo proyectado</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Todos los montos están expresados en dólares. No hay doble conteo: lo ya cobrado se
          refleja en el banco y desaparece de las cuentas por cobrar.
        </p>
        <div className="mt-4 divide-y divide-border">
          {desglose.map((d) => (
            <div key={d.concepto} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div className="max-w-xl">
                <p className="text-sm font-medium">{d.concepto}</p>
                <p className="text-xs text-muted-foreground">{d.nota}</p>
              </div>
              <p className="font-mono text-sm tabular-nums">{formatearMoneda(d.valor, "USD")}</p>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2 py-3">
            <p className="text-sm font-semibold">Total proyectado</p>
            <p className="font-mono text-sm font-semibold tabular-nums text-primary">
              {formatearMoneda(proyeccion.saldoProyectadoTotalUSD, "USD")}
            </p>
          </div>
        </div>
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
