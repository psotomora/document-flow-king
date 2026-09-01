/**
 * Cliente HTTP hacia la API .NET (ASP.NET Core) que se conecta a SQL Server.
 *
 * La URL base se toma de la variable de entorno `VITE_API_URL`
 * (por ejemplo `https://flujo.miempresa.local/api`) y puede sobrescribirse en
 * tiempo de ejecución guardando `flujo.apiUrl` en el almacenamiento local.
 *
 * Si no hay URL configurada, la aplicación funciona en MODO DEMO con los datos
 * en memoria (útil para la vista previa y para capacitación).
 */

const ENV_API_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";

export const CLAVE_TOKEN = "flujo.token";
export const CLAVE_URL = "flujo.apiUrl";

function esNavegador(): boolean {
  return typeof window !== "undefined";
}

export function urlApi(): string {
  const local = esNavegador() ? (window.localStorage.getItem(CLAVE_URL) ?? "") : "";
  return (local || ENV_API_URL).replace(/\/+$/, "");
}

export function configurarUrlApi(url: string) {
  if (!esNavegador()) return;
  const limpia = url.trim().replace(/\/+$/, "");
  if (limpia) window.localStorage.setItem(CLAVE_URL, limpia);
  else window.localStorage.removeItem(CLAVE_URL);
}

export function hayApi(): boolean {
  return urlApi().length > 0;
}

export function obtenerToken(): string | null {
  return esNavegador() ? window.localStorage.getItem(CLAVE_TOKEN) : null;
}

export function guardarToken(token: string | null) {
  if (!esNavegador()) return;
  if (token) window.localStorage.setItem(CLAVE_TOKEN, token);
  else window.localStorage.removeItem(CLAVE_TOKEN);
}

export class ErrorApi extends Error {
  estado: number;
  constructor(mensaje: string, estado: number) {
    super(mensaje);
    this.name = "ErrorApi";
    this.estado = estado;
  }
}

export async function api<T>(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; sinToken?: boolean } = {},
): Promise<T> {
  const base = urlApi();
  if (!base) throw new ErrorApi("No hay una API configurada (VITE_API_URL).", 0);

  const cabeceras: Record<string, string> = { "Content-Type": "application/json" };
  if (!opciones.sinToken) {
    const token = obtenerToken();
    if (token) cabeceras["Authorization"] = `Bearer ${token}`;
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}${ruta}`, {
      method: opciones.metodo ?? "GET",
      headers: cabeceras,
      body: opciones.cuerpo === undefined ? null : JSON.stringify(opciones.cuerpo),
    });
  } catch {
    throw new ErrorApi(
      "No se pudo contactar el servidor. Revise la URL de la API y que el servicio esté activo.",
      0,
    );
  }

  if (respuesta.status === 401) {
    guardarToken(null);
    throw new ErrorApi("Sesión expirada o credenciales inválidas.", 401);
  }

  const texto = await respuesta.text();
  const datos = texto ? (JSON.parse(texto) as unknown) : null;

  if (!respuesta.ok) {
    const generico =
      respuesta.status === 404
        ? "El servidor de la API no tiene disponible esta operación (404). Actualice y recompile el proyecto de la API (dotnet run) para incluir los endpoints más recientes."
        : `Error ${respuesta.status}`;
    const mensaje =
      (datos as { mensaje?: string; title?: string } | null)?.mensaje ??
      (datos as { title?: string } | null)?.title ??
      generico;
    throw new ErrorApi(mensaje, respuesta.status);
  }


  return datos as T;
}
