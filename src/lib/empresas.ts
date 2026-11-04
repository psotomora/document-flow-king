/**
 * Fase 5 SaaS: empresas (inquilinos), cupo de usuarios y Súper Administrador.
 * La autoridad es la API; aquí solo se consultan los datos y se calcula el
 * aspecto del indicador de cupo.
 */
import { useEffect, useState } from "react";
import { api, hayApi } from "@/lib/api";

export interface SesionSaas {
  disponible: boolean;
  superAdministrador: boolean;
  inquilino?: { id: number; codigo: string; nombre: string; fechaVencimiento?: string | null };
  maxUsuarios?: number | null;
  usuariosActivos?: number;
}

export interface Empresa {
  id: number;
  codigo: string;
  nombre: string;
  contacto?: string | null;
  correo?: string | null;
  activo: boolean;
  maxUsuarios: number | null;
  fechaVencimiento?: string | null;
  usuariosActivos: number;
  tokenConfigurado: boolean;
  ultimoLatido?: string | null;
  agenteEnLinea: boolean;
  esPrincipal: boolean;
}

export type NivelCupo = "normal" | "lleno" | "sinLimite";

/** Nivel del indicador: lleno cuando los activos alcanzan o superan el cupo. */
export function nivelCupo(activos: number, max: number | null | undefined): NivelCupo {
  if (max == null) return "sinLimite";
  return activos >= max ? "lleno" : "normal";
}

/** Porcentaje del cupo usado (0-100). */
export function porcentajeCupo(activos: number, max: number | null | undefined): number {
  if (max == null || max <= 0) return 0;
  return Math.min(100, Math.round((activos / max) * 100));
}

/** Visibilidad de la configuración directa; no sustituye la autorización de la API. */
export function mostrarConexionDirecta(modoApi: boolean, sesion: SesionSaas | null): boolean {
  if (!modoApi) return true;
  if (!sesion) return false;
  if (!sesion.disponible) return true; // Instalaciones anteriores a SaaS.
  return sesion.inquilino?.codigo.toLowerCase() === "principal";
}

export function useSesionSaas(recarga: number | string = 0): SesionSaas | null {
  const [respuesta, setRespuesta] = useState<{ clave: number | string; sesion: SesionSaas | null } | null>(null);
  useEffect(() => {
    if (!hayApi()) return;
    let vigente = true;
    api<SesionSaas>("/inquilinos/sesion")
      .then((s) => vigente && setRespuesta({ clave: recarga, sesion: s }))
      .catch(() => vigente && setRespuesta({ clave: recarga, sesion: null }));
    return () => {
      vigente = false;
    };
  }, [recarga]);
  return respuesta?.clave === recarga ? respuesta.sesion : null;
}
