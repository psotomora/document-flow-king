/** Construcción del informe HTML que se envía en el cuerpo del correo. */

export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Separa destinatarios por coma o punto y coma; devuelve válidos e inválidos. */
export function separarDestinatarios(texto: string) {
  const lista = texto
    .split(/[;,]/)
    .map((c) => c.trim())
    .filter(Boolean);
  const valido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
  return { validos: lista.filter(valido), invalidos: lista.filter((c) => !valido(c)) };
}

export interface DatosReporte {
  titulo: string;
  filtros: string[];
  columnas: string[];
  /** Índices de columnas alineadas a la derecha (montos). */
  derecha?: number[];
  filas: string[][];
  totales?: string[];
}

/** Tabla HTML con estilos en línea (compatibles con clientes de correo). */
export function construirReporteHtml(d: DatosReporte): string {
  const der = new Set(d.derecha ?? []);
  const celda = (t: string, i: number, tag: "td" | "th") =>
    `<${tag} style="border:1px solid #d0d7e2;padding:6px 8px;font-size:12px;${der.has(i) ? "text-align:right;" : "text-align:left;"}${tag === "th" ? "background:#1e3a8a;color:#ffffff;" : ""}">${escaparHtml(t)}</${tag}>`;
  const encabezado = `<tr>${d.columnas.map((c, i) => celda(c, i, "th")).join("")}</tr>`;
  const cuerpo = d.filas.length
    ? d.filas.map((f) => `<tr>${f.map((c, i) => celda(c, i, "td")).join("")}</tr>`).join("")
    : `<tr><td colspan="${d.columnas.length}" style="padding:10px;font-size:12px;">Sin registros para los filtros aplicados.</td></tr>`;
  const filtros = d.filtros.length
    ? `<p style="font-size:12px;color:#475569;margin:0 0 10px 0;">${d.filtros.map(escaparHtml).join(" · ")}</p>`
    : "";
  const totales = (d.totales ?? []).length
    ? `<p style="font-size:13px;margin:10px 0 0 0;"><strong>${d.totales!.map(escaparHtml).join(" · ")}</strong></p>`
    : "";
  return `<h2 style="font-family:Arial,sans-serif;font-size:16px;margin:0 0 6px 0;">${escaparHtml(d.titulo)}</h2>${filtros}<table style="border-collapse:collapse;font-family:Arial,sans-serif;">${encabezado}${cuerpo}</table>${totales}`;
}

/** Lee encabezados y celdas visibles (orden y columnas elegidos por el usuario); omite columnas sin título. */
export function leerTablaVisible(tabla: HTMLTableElement): { columnas: string[]; filas: string[][]; derecha: number[] } {
  const ths = Array.from(tabla.querySelectorAll("thead tr:last-child th"));
  const indices = ths.map((th, i) => ((th.textContent ?? "").trim() ? i : -1)).filter((i) => i >= 0);
  const columnas = indices.map((i) => (ths[i].textContent ?? "").trim());
  const derecha = indices
    .map((i, pos) => (ths[i].className.includes("text-right") ? pos : -1))
    .filter((p) => p >= 0);
  const filas = Array.from(tabla.querySelectorAll("tbody tr"))
    .filter((tr) => tr.children.length === ths.length)
    .map((tr) => indices.map((i) => (tr.children[i]?.textContent ?? "").trim()));
  return { columnas, filas, derecha };
}
