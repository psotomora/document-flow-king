/**
 * RF-017: exportación de listados y reportes a Excel y PDF.
 * Las librerías se cargan de forma dinámica para que solo se ejecuten en el
 * navegador y no durante el renderizado en el servidor.
 */

function sello(usuario: string): string {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString("es-CR");
  const hora = ahora.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
  return `Generado el ${fecha} a las ${hora} por ${usuario}`;
}

export async function exportarExcel(
  nombreArchivo: string,
  hoja: string,
  filas: Record<string, string | number>[],
  usuario: string,
): Promise<void> {
  const XLSX = await import("xlsx");
  const datos = filas.length ? filas : [{ Aviso: "Sin registros para los filtros aplicados" }];
  const ws = XLSX.utils.json_to_sheet(datos);
  XLSX.utils.sheet_add_aoa(ws, [[sello(usuario)]], { origin: -1 });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja.slice(0, 30));
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
}

export async function exportarPdf(
  nombreArchivo: string,
  titulo: string,
  subtitulo: string,
  columnas: string[],
  filas: (string | number)[][],
  usuario: string,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });

  doc.setFontSize(14);
  doc.text(titulo, 40, 40);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(subtitulo, 40, 56);
  doc.text(sello(usuario), 40, 70);

  autoTable(doc, {
    head: [columnas],
    body: filas.length ? filas.map((f) => f.map(String)) : [["Sin registros para los filtros aplicados"]],
    startY: 86,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [38, 62, 90], textColor: 255 },
    alternateRowStyles: { fillColor: [244, 246, 249] },
  });

  doc.save(`${nombreArchivo}.pdf`);
}
