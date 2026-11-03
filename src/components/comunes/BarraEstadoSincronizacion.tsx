import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, hayApi } from "@/lib/api";
import { useApp } from "@/contexto/AppContexto";
import { estadoSoftland, fechaUtc } from "@/lib/estado-softland";

export type EntidadSincronizable = "pedidos" | "facturas" | "documentosPagar";

interface EstadoSinc {
  entidad: string;
  companiaId: string | null;
  ultimaSincronizacion: string | null;
  solicitadaEn: string | null;
  resultado: string | null;
  ultimaVerificacion: string | null;
  modo: "directa" | "agente";
}

/** Fecha UTC de la API ("2026-11-02T23:50:00") mostrada en hora local. */
function formatear(utc: string): string {
  const fecha = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(utc) ? utc : `${utc}Z`);
  return fecha.toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
}

/** Leyenda al inicio de las pantallas que leen el ERP: última sincronización y botón bajo demanda. */
export function BarraEstadoSincronizacion({ entidad }: { entidad: EntidadSincronizable }) {
  const { companiaActiva, modoApi, recargar } = useApp();
  const [estados, setEstados] = useState<EstadoSinc[]>([]);
  const [ahora, setAhora] = useState(() => Date.now());
  const [error, setError] = useState(false);
  const [cargando, setCargando] = useState(false);
  const conApi = modoApi;
  const compania = companiaActiva === "todas" ? null : companiaActiva;

  const cargar = useCallback(async () => {
    if (!modoApi || !hayApi()) return;
    try {
      const q = compania ? `?companiaId=${encodeURIComponent(compania)}` : "";
      const filas = await api<EstadoSinc[]>(`/sincronizacion/estado${q}`);
      const propias = filas.filter((f) => f.entidad === entidad);
      setEstados(propias);
      setError(false);
    } catch {
      setError(true);
    }
  }, [compania, entidad, modoApi]);

  useEffect(() => {
    void cargar();
    const t = setInterval(() => void cargar(), 30000);
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    return () => { clearInterval(t); clearInterval(reloj); };
  }, [cargar]);

  const agente = estados.some((e) => e.modo === "agente");

  async function sincronizar() {
    setCargando(true);
    try {
      if (agente) {
        await api("/sincronizacion/solicitar", { metodo: "POST", cuerpo: { entidad, companiaId: compania } });
        toast.success("Sincronización solicitada.");
      } else {
        await recargar();
      }
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo solicitar la sincronización.");
    } finally {
      setCargando(false);
    }
  }

  const verificaciones = estados.map((e) => estadoSoftland(e.ultimaVerificacion ?? e.ultimaSincronizacion, e.resultado === "ok" ? true : e.resultado === "error" ? false : null, ahora));
  const color = error || verificaciones.includes("error") ? "error" : verificaciones.length > 0 && verificaciones.every((v) => v === "exito") ? "exito" : "pendiente";
  const fechas = estados.map((e) => agente ? e.ultimaSincronizacion : e.ultimaVerificacion ?? e.ultimaSincronizacion).filter((f): f is string => !!f).sort((a, b) => fechaUtc(a) - fechaUtc(b));
  const fecha = fechas[0];
  const solicitud = estados.find((e) => e.solicitadaEn)?.solicitadaEn;
  const texto = !conApi
    ? "Modo demostración: datos locales sin sincronización con el ERP"
    : fecha
      ? `${agente ? "Última sincronización" : "Última verificación"} con Softland: ${formatear(fecha)}`
      : agente ? "Softland: pendiente de la primera sincronización" : "Softland: sin verificación registrada";
  const estilo = !conApi || color === "pendiente" ? "border-border bg-muted/40 text-muted-foreground" : color === "exito" ? "border-exito/40 bg-exito-suave text-exito" : "border-destructive/40 bg-destructive/10 text-destructive";

  return (
    <div role="status" className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm ${estilo}`}>
      <span>
        {texto}
        {conApi && color === "error" ? " · Conexión fallida o sin verificar en los últimos 5 minutos" : ""}
        {conApi && solicitud ? ` · solicitud en curso desde ${formatear(solicitud)}` : ""}
      </span>
      {conApi ? (
        <Button variant="outline" size="sm" onClick={sincronizar} disabled={cargando} className="gap-1.5">
          <RefreshCw className={`size-4 ${cargando ? "animate-spin" : ""}`} /> {agente ? "Sincronizar ahora" : "Actualizar"}
        </Button>
      ) : null}
    </div>
  );
}
