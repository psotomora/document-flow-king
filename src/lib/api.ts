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

function normalizarUrlApi(url: string): string {
  const valor = url.trim();
  if (!valor) return "";

  if (/^https?:\/\//i.test(valor)) return valor.replace(/\/+$/, "");

  if (esNavegador()) {
    const ruta = `/${valor.replace(/^\/+/, "")}`;
    return `${window.location.origin}${ruta}`.replace(/\/+$/, "");
  }

  return valor.replace(/\/+$/, "");
}

export function urlApi(): string {
  const local = esNavegador() ? (window.localStorage.getItem(CLAVE_URL) ?? "") : "";
  const original = local || ENV_API_URL;
  const normalizada = normalizarUrlApi(original);

  // Corrige automáticamente valores antiguos como "api", que el navegador
  // resolvía de forma relativa a /usuarios y producía /usuarios/api/usuarios.
  if (esNavegador() && local && normalizada !== local) {
    window.localStorage.setItem(CLAVE_URL, normalizada);
  }

  return normalizada;
}

export function configurarUrlApi(url: string) {
  if (!esNavegador()) return;
  const limpia = normalizarUrlApi(url);
  if (limpia) window.localStorage.setItem(CLAVE_URL, limpia);
  else window.localStorage.removeItem(CLAVE_URL);
}

export function hayApi(): boolean {
  return urlApi().length > 0;
}

/** Comprueba la API y su acceso a SQL Server antes de guardar la URL. */
export async function probarConexionApi(url: string): Promise<string> {
  const base = normalizarUrlApi(url);
  if (!base) throw new ErrorApi("Indique la URL de la API.", 0);

  let respuesta: Response;
  try {
    respuesta = await fetch(`${base}/salud`, {
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    throw new ErrorApi(
      `No se pudo contactar la API en ${base}/salud (${detalle}). Confirme el protocolo, el puerto, que dotnet run siga activo y que el origen esté permitido en Cors:Origenes.`,
      0,
    );
  }

  const texto = await respuesta.text();
  type RespuestaSalud = {
    estado?: string;
    mensaje?: string;
    detalle?: string;
    codigoSql?: number;
  };
  let datos: RespuestaSalud | null = null;
  try {
    datos = JSON.parse(texto) as RespuestaSalud;
  } catch {
    datos = null;
  }


  if (!respuesta.ok) {
    const base404 = "La URL no corresponde a esta API. Debe terminar en /api.";
    const generico =
      respuesta.status === 404 ? base404 : `La API respondió con error ${respuesta.status}.`;
    const extra = datos?.codigoSql ? ` (código SQL ${datos.codigoSql})` : "";
    const crudo = !datos && texto ? ` Respuesta recibida: ${texto.slice(0, 300)}` : "";
    throw new ErrorApi(`${datos?.mensaje ?? generico}${extra}${crudo}`, respuesta.status);
  }

  if (datos?.estado !== "ok") {
    throw new ErrorApi(
      datos?.mensaje ??
        `La respuesta recibida no corresponde a la API de Flujo de Efectivo. Contenido: ${texto.slice(0, 300)}`,
      0,
    );
  }

  return base;
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
  const metodo = opciones.metodo ?? "GET";
  const urlSolicitada = `${base}${ruta}`;

  const cabeceras: Record<string, string> = { "Content-Type": "application/json" };
  if (!opciones.sinToken) {
    const token = obtenerToken();
    if (token) cabeceras["Authorization"] = `Bearer ${token}`;
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(urlSolicitada, {
      method: metodo,
      headers: cabeceras,
      body: opciones.cuerpo === undefined ? null : JSON.stringify(opciones.cuerpo),
    });
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    throw new ErrorApi(
      `No se pudo contactar el servidor. Solicitud: ${metodo} ${urlSolicitada}. Detalle: ${detalle}`,
      0,
    );
  }

  if (respuesta.status === 401) {
    guardarToken(null);
    throw new ErrorApi("Sesión expirada o credenciales inválidas.", 401);
  }

  const texto = await respuesta.text();

  // La respuesta puede no ser JSON (por ejemplo una página HTML de error de IIS
  // o del servidor de desarrollo cuando la URL de la API apunta al sitio web).
  let datos: unknown = null;
  let esJson = true;
  if (texto) {
    try {
      datos = JSON.parse(texto) as unknown;
    } catch {
      esJson = false;
      datos = null;
    }
  }

  if (!esJson) {
    const tipo = respuesta.headers.get("content-type") ?? "no informado";
    const servidor = respuesta.headers.get("server") ?? "no informado";
    const versionApi = respuesta.headers.get("x-flujoefectivo-api-version");
    const requestId = respuesta.headers.get("x-flujoefectivo-request-id");
    const tituloHtml = texto.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim();
    const origen = versionApi
      ? `La solicitud sí llegó a la API versión ${versionApi}.`
      : "La respuesta no contiene la identificación de la API: IIS, el sitio web o el proxy atendió la solicitud antes de que llegara a la API .NET.";
    const diagnostico = [
      `Solicitud: ${metodo} ${urlSolicitada}`,
      `Dirección final: ${respuesta.url || urlSolicitada}`,
      `Estado: ${respuesta.status} ${respuesta.statusText || ""}`.trim(),
      `Tipo: ${tipo}`,
      `Servidor: ${servidor}`,
      versionApi ? `Versión API: ${versionApi}` : "Versión API: no detectada",
      requestId ? `Seguimiento: ${requestId}` : "Seguimiento: no disponible",
      tituloHtml ? `Página recibida: ${tituloHtml}` : "",
      origen,
    ].filter(Boolean).join("\n");
    throw new ErrorApi(
      respuesta.ok
        ? `Se recibió HTML en vez de datos JSON.\n${diagnostico}`
        : `El servidor respondió en formato HTML.\n${diagnostico}`,
      respuesta.status || 0,
    );
  }

  if (!respuesta.ok) {
    const generico =
      respuesta.status === 404
        ? "El servidor de la API no tiene disponible esta operación (404). Actualice y recompile el proyecto de la API (dotnet run) para incluir los endpoints más recientes."
        : `Error ${respuesta.status}`;
    const mensaje =
      (datos as { mensaje?: string; title?: string } | null)?.mensaje ??
      (datos as { title?: string } | null)?.title ??
      generico;
    const versionApi = respuesta.headers.get("x-flujoefectivo-api-version");
    const requestId = respuesta.headers.get("x-flujoefectivo-request-id");
    const referencia = [
      `${metodo} ${urlSolicitada}`,
      versionApi ? `API ${versionApi}` : "",
      requestId ? `seguimiento ${requestId}` : "",
    ].filter(Boolean).join(" · ");
    throw new ErrorApi(`${mensaje}\n${referencia}`, respuesta.status);
  }


  return datos as T;
}
