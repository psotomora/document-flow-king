import type { CSSProperties } from "react";
import { useApp } from "@/contexto/AppContexto";

/** Opciones disponibles para la cantidad de filas visibles en las tablas. */
export const OPCIONES_FILAS = [10, 20, 50, 100] as const;
/** Cantidad de filas visibles por defecto. */
export const FILAS_DEFECTO = 20;
/** Preferencia global del usuario con la cantidad de filas visibles. */
export const PREF_FILAS_GLOBAL = "filasVisibles";
/** Preferencia por pantalla con la cantidad de filas visibles. */
export const prefFilasPantalla = (pantalla: string) => `filas_${pantalla}`;

const valida = (n: number) => (OPCIONES_FILAS as readonly number[]).includes(n);

/** Cantidad de filas visibles global del usuario. */
export function useFilasGlobales() {
  const { preferencias, actualizarPreferencia } = useApp();
  const guardado = Number(preferencias[PREF_FILAS_GLOBAL]);
  const filas = valida(guardado) ? guardado : FILAS_DEFECTO;
  return {
    filas,
    establecer: (v: number) => actualizarPreferencia(PREF_FILAS_GLOBAL, String(v)),
  };
}

/**
 * Cantidad de filas visibles para una tabla concreta. Usa la preferencia
 * propia de la pantalla y, si no existe, la preferencia global del usuario.
 */
export function useFilasVisibles(pantalla: string) {
  const { preferencias, actualizarPreferencia } = useApp();
  const global = Number(preferencias[PREF_FILAS_GLOBAL]);
  const propia = Number(preferencias[prefFilasPantalla(pantalla)]);
  const filas = valida(propia) ? propia : valida(global) ? global : FILAS_DEFECTO;
  const estiloTabla: CSSProperties = { maxHeight: `calc(${filas} * 3.25rem + 3rem)` };
  return {
    filas,
    estiloTabla,
    establecer: (v: number) => actualizarPreferencia(prefFilasPantalla(pantalla), String(v)),
  };
}
