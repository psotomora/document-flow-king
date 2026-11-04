import type { Compania } from "@/data/tipos";

export function configuracionCompaniasAgente(companias: Compania[], esquemas: Record<string, string>): string | null {
  if (companias.length === 0) return null;
  const entradas = companias.map((c) => ({ CompaniaId: Number(c.id), Esquema: (esquemas[c.id] ?? c.codigo).trim() }));
  if (entradas.some((c) => !Number.isSafeInteger(c.CompaniaId) || c.CompaniaId <= 0 || !c.Esquema)) return null;
  return JSON.stringify({ Companias: entradas }, null, 2);
}