import type { Usuario } from "@/data/tipos";

/** Opciones de la aplicación cuya visibilidad se controla por usuario. */
export const OPCIONES_VISIBILIDAD = [
  {
    clave: "verBancos",
    etiqueta: "Saldo por banco",
    ruta: "/bancos",
    detalle: "Consultar los saldos disponibles de cada cuenta bancaria.",
  },
  {
    clave: "verConsolidado",
    etiqueta: "Saldo consolidado",
    ruta: "/consolidado",
    detalle: "Ver el saldo consolidado y el saldo proyectado.",
  },
  {
    clave: "verErogaciones",
    etiqueta: "Erogaciones",
    ruta: "/erogaciones",
    detalle: "Consultar y registrar las salidas de efectivo.",
  },
  {
    clave: "verProyeccion",
    etiqueta: "Proyección de cobros",
    ruta: "/proyeccion",
    detalle: "Ver la proyección de cobros por vencimiento.",
  },
] as const;

export type ClaveVisibilidad = (typeof OPCIONES_VISIBILIDAD)[number]["clave"];

/** Un permiso ausente se interpreta como permitido; el administrador ve todo. */
export function puedeVer(usuario: Usuario, clave: ClaveVisibilidad): boolean {
  if (usuario.perfil === "administrador") return true;
  return usuario[clave] !== false;
}

/** Devuelve la opción restringida que corresponde a la ruta indicada, si existe. */
export function opcionDeRuta(ruta: string) {
  return OPCIONES_VISIBILIDAD.find((o) => ruta === o.ruta || ruta.startsWith(`${o.ruta}/`));
}
