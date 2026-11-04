import { ErrorApi } from "@/lib/api";

/** Intervalo del latido que mantiene viva la sesión (la API la libera tras 3 min sin actividad). */
export const MS_LATIDO_SESION = 60_000;

/** El ingreso fue rechazado porque el usuario ya tiene otra sesión activa. */
export function esSesionEnUso(e: unknown): boolean {
  return e instanceof ErrorApi && e.estado === 409;
}
