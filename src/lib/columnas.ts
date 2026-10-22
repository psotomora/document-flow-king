import { isValidElement, type ReactNode } from "react";

/** Preferencia de columnas: orden por etiqueta y etiquetas ocultas. */
export interface ConfigColumnas {
  orden: string[];
  ocultas: string[];
}

/** Texto visible de un nodo React (para identificar la columna). */
export function textoNodo(n: ReactNode): string {
  if (n == null || typeof n === "boolean") return "";
  if (typeof n === "string" || typeof n === "number") return String(n);
  if (Array.isArray(n)) return n.map(textoNodo).join("");
  if (isValidElement(n)) return textoNodo((n.props as { children?: ReactNode }).children);
  return "";
}

function hash(t: string): string {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Clave corta (máx. 60) por pantalla y conjunto de columnas. */
export function claveColumnas(ruta: string, etiquetas: string[]): string {
  const r = ruta.replace(/^\/+|\/+$/g, "").replace(/\//g, "-").slice(0, 30) || "inicio";
  return `col_${r}_${hash(etiquetas.join("|"))}`;
}

export function leerConfigColumnas(valor: string | undefined): ConfigColumnas | null {
  if (!valor) return null;
  try {
    const v = JSON.parse(valor);
    if (Array.isArray(v?.orden) && Array.isArray(v?.ocultas)) return v;
  } catch {
    // Valor inválido: se usa el orden original.
  }
  return null;
}

/** Índices originales en el orden configurado, sin las ocultas. */
export function permutacionColumnas(etiquetas: string[], cfg: ConfigColumnas | null): number[] {
  const idx = etiquetas.map((_, i) => i);
  if (!cfg) return idx;
  const pos = (i: number) => {
    const p = cfg.orden.indexOf(etiquetas[i]);
    return p === -1 ? cfg.orden.length + i : p;
  };
  const visibles = idx.filter((i) => !cfg.ocultas.includes(etiquetas[i]));
  const res = (visibles.length ? visibles : idx).sort((a, b) => pos(a) - pos(b));
  return res;
}
