import { useEffect, useState } from "react";
import { useApp } from "@/contexto/AppContexto";
import { api, hayApi } from "@/lib/api";
import { verificarConexion, type DiagnosticoAgente, type VerificacionConexion } from "@/lib/estado-conexion";
import { estadoSoftland, fechaUtc } from "@/lib/estado-softland";
import { cn } from "@/lib/utils";

interface Conexion { companiaId: number; modo: "directa" | "agente" }
interface Datos { conexiones: Conexion[]; verificaciones: VerificacionConexion[]; agente: DiagnosticoAgente | null; usuarioId: string }

export function IndicadorConexion() {
  const { modoApi, companias, companiaActiva, usuario } = useApp();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState(false);
  const [ahora, setAhora] = useState(0);
  useEffect(() => {
    if (!modoApi || !hayApi()) return;
    let activo = true;
    setDatos(null);
    setError(false);
    const cargar = async () => {
      try {
        const [conexiones, verificaciones] = await Promise.all([
          api<Conexion[]>("/sincronizacion/conexiones"),
          api<VerificacionConexion[]>("/sincronizacion/estado"),
        ]);
        const agente = await api<DiagnosticoAgente>("/agente/estado").catch(() => null);
        if (activo) { setDatos({ conexiones, verificaciones, agente, usuarioId: usuario.id }); setError(false); }
      } catch { if (activo) setError(true); }
    };
    void cargar();
    setAhora(Date.now());
    const consulta = setInterval(() => void cargar(), 30000);
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => { activo = false; clearInterval(consulta); clearInterval(reloj); };
  }, [modoApi, usuario.id, companiaActiva]);

  if (!modoApi) return <span className="text-xs text-muted-foreground">Modo demostración</span>;
  const propios = datos?.usuarioId === usuario.id ? datos : null;
  const visibles = companias.filter((c) => companiaActiva === "todas" || c.id === companiaActiva);
  const sinConexion = visibles.every((c) => !propios?.conexiones.some((x) => String(x.companiaId) === c.id));
  const agente = propios?.agente;
  const verAgente = agente && (agente.ultimoDiagnostico || agente.enLinea) && sinConexion
    ? estadoSoftland(agente.ultimoDiagnostico ?? null, agente.softlandOk ?? null, ahora) : null;
  const estadoAgente = !agente?.enLinea ? "error" : verAgente ?? "pendiente";
  return (
    <div role="status" aria-label="Estado de conexión con Softland" className="flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-xs">
      {visibles.map((c) => {
        const conexion = propios?.conexiones.find((x) => String(x.companiaId) === c.id);
        const verificacion = conexion ? verificarConexion(conexion.modo, c.id, propios?.verificaciones ?? [], propios?.agente ?? null, ahora) : null;
        const estado = error ? "error" : verificacion?.estado ?? "pendiente";
        const texto = estado === "exito" ? "Conectada" : estado === "error" ? "Fallida o sin verificar" : "Sin verificación";
        const fecha = verificacion?.fecha;
        const fechaValida = fecha && Number.isFinite(fechaUtc(fecha));
        return <div key={c.id} className="min-w-0">
          <span className={cn("flex items-center gap-1.5 font-medium", estado === "exito" ? "text-exito" : estado === "error" ? "text-destructive" : "text-muted-foreground")}>
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" />
            <span>{visibles.length > 1 ? `${c.codigo} · ` : ""}{conexion ? conexion.modo === "agente" ? "Modo Agente" : "Conexión directa" : error ? "Conexión no disponible" : "Consultando conexión…"}{conexion ? ` · ${texto}` : ""}</span>
          </span>
          {conexion?.modo === "agente" ? <span className="mt-0.5 block text-muted-foreground">Última verificación: {fechaValida ? new Date(fechaUtc(fecha)).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" }) : "sin registrar"}</span> : null}
        </div>;
      })}
      {verAgente ? <div className="min-w-0">
        <span className={cn("flex items-center gap-1.5 font-medium", estadoAgente === "exito" ? "text-exito" : estadoAgente === "error" ? "text-destructive" : "text-muted-foreground")}>
          <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" />
          <span>Modo Agente · {!agente?.enLinea ? "Agente desconectado" : estadoAgente === "exito" ? "Conectado" : estadoAgente === "error" ? "Fallida o sin verificar" : "Sin verificación"}</span>
        </span>
        <span className="mt-0.5 block text-muted-foreground">Última verificación: {agente?.ultimoDiagnostico && Number.isFinite(fechaUtc(agente.ultimoDiagnostico)) ? new Date(fechaUtc(agente.ultimoDiagnostico)).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" }) : "sin registrar"}</span>
      </div> : null}
    </div>
  );
}