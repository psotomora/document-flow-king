/**
 * Empresa (cliente) activa en modo SaaS multicliente.
 *
 * El código lo escribe la persona al ingresar; nunca se consulta una lista de
 * empresas: ningún usuario puede enterarse de la existencia de otros clientes.
 */

const CLAVE_CODIGO = "flujo.empresaCodigo";
const CLAVE_NOMBRE = "flujo.empresaNombre";

function almacen(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Código recordado en este navegador (vacío si nunca se ingresó). */
export function empresaCodigo(): string {
  return almacen()?.getItem(CLAVE_CODIGO) ?? "";
}

export function guardarEmpresaCodigo(codigo: string) {
  const limpio = codigo.trim();
  if (limpio) almacen()?.setItem(CLAVE_CODIGO, limpio);
  else almacen()?.removeItem(CLAVE_CODIGO);
}

/** Nombre de la empresa de la sesión actual, devuelto por la API al ingresar. */
export function empresaNombre(): string {
  return almacen()?.getItem(CLAVE_NOMBRE) ?? "";
}

export function guardarEmpresaNombre(nombre: string | null | undefined) {
  if (nombre) almacen()?.setItem(CLAVE_NOMBRE, nombre);
  else almacen()?.removeItem(CLAVE_NOMBRE);
}

/**
 * Empresa en la que trabaja temporalmente el personal de Aplix (superadmin).
 * Mientras esté fijada, todas las consultas se hacen contra la base de esa
 * empresa; sin ella, el superadministrador solo ve la instalación principal.
 */
const CLAVE_TRABAJO_ID = "flujo.empresaTrabajoId";
const CLAVE_TRABAJO_NOMBRE = "flujo.empresaTrabajoNombre";

export function empresaTrabajoId(): number {
  const valor = Number(almacen()?.getItem(CLAVE_TRABAJO_ID) ?? 0);
  return Number.isFinite(valor) && valor > 0 ? valor : 0;
}

export function empresaTrabajoNombre(): string {
  return almacen()?.getItem(CLAVE_TRABAJO_NOMBRE) ?? "";
}

export function fijarEmpresaTrabajo(id: number | null, nombre?: string) {
  const a = almacen();
  if (!a) return;
  if (id && id > 0) {
    a.setItem(CLAVE_TRABAJO_ID, String(id));
    a.setItem(CLAVE_TRABAJO_NOMBRE, nombre ?? "");
  } else {
    a.removeItem(CLAVE_TRABAJO_ID);
    a.removeItem(CLAVE_TRABAJO_NOMBRE);
  }
}
