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
