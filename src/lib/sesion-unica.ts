/** Intervalo del latido que mantiene viva la sesión (la API la libera tras 3 min sin actividad). */
export const MS_LATIDO_SESION = 60_000;

/** El ingreso fue rechazado (HTTP 409) porque el usuario ya tiene otra sesión activa. */
export function esSesionEnUso(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { estado?: unknown }).estado === 409;
}
