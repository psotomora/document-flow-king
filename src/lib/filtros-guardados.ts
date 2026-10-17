/** Una clave independiente por pantalla y campo evita sobrescribir otros filtros. */
export const claveFiltro = (pantalla: string, campo: string) => `filtro_${pantalla}_${campo}`;

export function leerFiltro<T>(bruto: string | undefined, defecto: T): T {
  if (bruto === undefined) return defecto;
  try {
    const valor: unknown = JSON.parse(bruto);
    if (Array.isArray(defecto)) {
      return Array.isArray(valor) && valor.every((v) => typeof v === "string") ? valor as T : defecto;
    }
    return typeof valor === typeof defecto && valor !== null ? valor as T : defecto;
  } catch {
    return defecto;
  }
}

export const clavePreferenciasDemo = (usuarioId: string) => `acfi:demo:preferencias:${usuarioId}`;

export function leerPreferenciasDemo(usuarioId: string): Record<string, string> {
  try {
    const valor: unknown = JSON.parse(window.localStorage.getItem(clavePreferenciasDemo(usuarioId)) ?? "{}");
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) return {};
    return Object.fromEntries(Object.entries(valor).filter(([, v]) => typeof v === "string"));
  } catch {
    return {};
  }
}