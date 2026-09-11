/**
 * Estado de cuenta por cliente en PDF (logo de Aplix, datos del cliente y
 * desglose de sus facturas). Se genera en el navegador y puede descargarse o
 * enviarse por correo a través de la API.
 */
import type { Moneda } from "@/data/tipos";
import type { FacturaCalculada } from "@/lib/calculos";
import { formatearFecha, formatearMoneda } from "@/lib/formato";

const LOGO_URL =
  "https://document-flow-king.lovable.app/__l5e/assets-v1/e71ea6c3-b2e8-40c3-a8f5-c4f66d7f945a/aplix-isotipo.png";

export interface EstadoCuentaPdf {
  /** Contenido del PDF en base64, sin el prefijo data:. */
  base64: string;
  blob: Blob;
  nombreArchivo: string;
}

async function logoBase64(): Promise<string | null> {
  try {
    const respuesta = await fetch(LOGO_URL);
    if (!respuesta.ok) return null;
    const blob = await respuesta.blob();
    return await new Promise<string>((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(String(lector.result));
      lector.onerror = () => rechazar(new Error("logo"));
      lector.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function limpiarNombre(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "cliente"
  );
}

export async function generarEstadoCuenta(
  cliente: string,
  facturas: FacturaCalculada[],
  compania: string,
  usuario: string,
): Promise<EstadoCuentaPdf> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const ancho = doc.internal.pageSize.getWidth();
  const hoy = new Date();

  const logo = await logoBase64();
  if (logo) {
    try {
      doc.addImage(logo, "PNG", 40, 32, 54, 54);
    } catch {
      /* si el logo no puede incrustarse, el documento se emite sin él */
    }
  }

  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59);
  doc.text("Estado de cuenta", logo ? 108 : 40, 54);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(compania || "Aplix", logo ? 108 : 40, 70);
  doc.text(`Fecha de emisión: ${formatearFecha(hoy.toISOString().slice(0, 10))}`, logo ? 108 : 40, 84);

  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Cliente: ${cliente}`, 40, 116);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Documentos incluidos: ${facturas.length}`, ancho - 40, 116, { align: "right" });

  autoTable(doc, {
    head: [["Factura", "Emisión", "Vencimiento", "Días", "Moneda", "Facturado", "Pagado", "Saldo", "Estado"]],
    body: facturas.length
      ? facturas.map((f) => [
          f.numero,
          formatearFecha(f.fechaEmision),
          formatearFecha(f.fechaVencimiento),
          f.diasParaVencer === null || f.diasParaVencer === undefined ? "—" : String(f.diasParaVencer),
          f.moneda,
          formatearMoneda(f.monto, f.moneda),
          formatearMoneda(f.totalPagado, f.moneda),
          formatearMoneda(Math.max(f.saldoPendiente, 0), f.moneda),
          f.estado,
        ])
      : [["Sin facturas pendientes para este cliente", "", "", "", "", "", "", "", ""]],
    startY: 132,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [38, 62, 90], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 246, 249] },
    columnStyles: { 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
  });

  type ConTabla = { lastAutoTable?: { finalY: number } };
  let y = ((doc as unknown as ConTabla).lastAutoTable?.finalY ?? 132) + 24;

  for (const m of ["USD", "CRC"] as Moneda[]) {
    const propias = facturas.filter((f) => f.moneda === m);
    if (propias.length === 0) continue;
    const facturado = propias.reduce((s, f) => s + f.monto, 0);
    const saldo = propias.reduce((s, f) => s + Math.max(f.saldoPendiente, 0), 0);
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total facturado ${m}: ${formatearMoneda(facturado, m)}`, 40, y);
    doc.text(`Saldo pendiente ${m}: ${formatearMoneda(saldo, m)}`, ancho - 40, y, { align: "right" });
    y += 16;
  }

  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(
    `Generado el ${hoy.toLocaleDateString("es-CR")} a las ${hoy.toLocaleTimeString("es-CR", {
      hour: "2-digit",
      minute: "2-digit",
    })} por ${usuario}`,
    40,
    y + 12,
  );

  const blob = doc.output("blob") as Blob;
  const datos = doc.output("datauristring");
  const base64 = datos.slice(datos.indexOf(",") + 1);
  return {
    base64,
    blob,
    nombreArchivo: `estado-cuenta-${limpiarNombre(cliente)}.pdf`,
  };
}
