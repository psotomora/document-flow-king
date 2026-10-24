/** Resolución independiente del navegador: producción nunca usa preferencias locales. */
export function resolverUrlApi({ configurada = "", desarrollo, local = "", origen = "" }: {
  configurada?: string;
  desarrollo: boolean;
  local?: string;
  origen?: string;
}): string {
  const valor = configurada.trim() || (desarrollo ? local.trim() : "/api");
  if (!valor) return "";
  if (/^https?:\/\//i.test(valor)) return valor.replace(/\/+$/, "");
  const ruta = `/${valor.replace(/^\/+/, "")}`.replace(/\/+$/, "");
  return origen ? `${origen}${ruta}` : ruta;
}