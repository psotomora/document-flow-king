/**
 * Licenciamiento: consulta del estado, carga del archivo .lic y —solo en el
 * servidor emisor interno— emisión de licencias para clientes.
 */
import { api, hayApi } from "@/lib/api";

export type EstadoLicenciaCodigo =
  | "vigente"
  | "porVencer"
  | "gracia"
  | "bloqueada"
  | "ausente"
  | "libre";

export interface EstadoLicencia {
  estado: EstadoLicenciaCodigo;
  requerida: boolean;
  bloquea: boolean;
  mensaje: string;
  huella: string;
  emisor: boolean;
  hayLlavePublica: boolean;
  clienteNombre?: string | null;
  clienteCodigo?: string | null;
  producto?: string | null;
  vence?: string | null;
  diasRestantes?: number | null;
  companias: string[];
  maxUsuarios: number;
  usuariosActivos: number;
  serie?: string | null;
  cargadaEn?: string | null;
}

export interface LicenciaEmitida {
  id: string;
  serie: string;
  producto: string;
  clienteCodigo: string;
  clienteNombre: string;
  huella: string;
  companias: string;
  maxUsuarios: number;
  vence: string;
  diasGracia: number;
  notas?: string | null;
  archivo: string;
  emitidaEn: string;
  emitidaPor: string;
}

export interface DatosEmision {
  clienteCodigo: string;
  clienteNombre: string;
  producto: string;
  vence: string;
  huella: string;
  companias: string;
  maxUsuarios: number;
  diasGracia: number;
  notas: string;
}

export function licenciaDisponible(): boolean {
  return hayApi();
}

export function estadoLicencia(): Promise<EstadoLicencia> {
  return api<EstadoLicencia>("/licencia");
}

export function cargarLicencia(archivo: string): Promise<EstadoLicencia> {
  return api<EstadoLicencia>("/licencia", { metodo: "POST", cuerpo: { archivo } });
}

export function exigirLicencia(activa: boolean): Promise<EstadoLicencia> {
  return api<EstadoLicencia>("/licencia/requerida", { metodo: "POST", cuerpo: { activa } });
}

export function licenciasEmitidas(): Promise<LicenciaEmitida[]> {
  return api<LicenciaEmitida[]>("/licencias");
}

export function emitirLicencia(datos: DatosEmision) {
  return api<{ archivo: string; nombreArchivo: string; serie: string }>("/licencias/emitir", {
    metodo: "POST",
    cuerpo: datos,
  });
}

export function generarLlaves(): Promise<{ privada: string; publica: string }> {
  return api<{ privada: string; publica: string }>("/licencias/llaves", { metodo: "POST" });
}

/** Descarga un archivo de texto (por ejemplo la licencia .lic) desde el navegador. */
export function descargarTexto(nombre: string, contenido: string) {
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/** Texto corto para el aviso superior; null cuando no hay nada que advertir. */
export function avisoLicencia(estado: EstadoLicencia): string | null {
  if (!estado.requerida) return null;
  if (estado.estado === "vigente") return null;
  return estado.mensaje;
}
