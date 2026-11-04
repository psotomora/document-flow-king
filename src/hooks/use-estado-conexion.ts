import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useApp } from "@/contexto/AppContexto";
import { api, hayApi } from "@/lib/api";
import { type DiagnosticoAgente, type VerificacionConexion } from "@/lib/estado-conexion";

export interface ConexionErp {
  companiaId: number;
  modo: "directa" | "agente";
  intervaloMinutos: number;
}

export interface EstadoAgente extends DiagnosticoAgente {
  tokenConfigurado: boolean;
  ultimoLatido: string | null;
  versionAgente: string | null;
  equipo: string | null;
  softlandLatenciaMs: number | null;
  softlandMensaje: string | null;
}

/** Una consulta por usuario para que la barra y Parámetros compartan incluso la actualización manual. */
export function useEstadoConexion() {
  const { modoApi, usuario } = useApp();
  const [ahora, setAhora] = useState(0);
  useEffect(() => {
    setAhora(Date.now());
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(reloj);
  }, []);
  const consulta = useQuery({
    queryKey: ["estado-conexion", usuario.id],
    enabled: modoApi && hayApi(),
    staleTime: 30000,
    refetchInterval: 30000,
    queryFn: async () => {
      // Una consulta de sincronización fallida no invalida un diagnóstico disponible del agente.
      const [conexiones, verificaciones, agente] = await Promise.all([
        api<ConexionErp[]>("/sincronizacion/conexiones").catch(() => null),
        api<VerificacionConexion[]>("/sincronizacion/estado").catch(() => null),
        api<EstadoAgente>("/agente/estado").catch(() => null),
      ]);
      return { conexiones, verificaciones, agente };
    },
  });
  return { ...consulta, ahora };
}