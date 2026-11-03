import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, hayApi } from "@/lib/api";
import { useApp } from "@/contexto/AppContexto";

export type EntidadSincronizable = "pedidos" | "facturas" | "documentosPagar";

interface EstadoSinc {
  entidad: string;
  companiaId: string | null;
  ultimaSincronizacion: string | null;
  solicitadaEn: string | null;
  resultado: string | null;
}

/** Fecha UTC de la API ("2026-11-02T23:50:00") mostrada en hora local. */
function formatear(utc: string): string {
  const fecha = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(utc) ? utc : `${utc}Z`);
  return fecha.toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
}

/** Leyenda al inicio de las pantallas que leen el ERP: última sincronización y botón bajo demanda. */
export function BarraEstadoSincronizacion({ entidad }: { entidad: EntidadSincronizable }) {
  const { companiaActiva } = useApp();
  const [estado, setEstado] = useState<EstadoSinc | null>(null);
  const [cargando, setCargando] = useState(false);
  const conApi = typeof window !== "undefined" && hayApi();
  const compania = companiaActiva === "todas" ? null : companiaActiva;

  const cargar = useCallback(async () => {
    if (!hayApi()) return;
    try {
      const q = compania ? `?companiaId=${encodeURIComponent(compania)}` : "";
      const filas = await api<EstadoSinc[]>(`/sincronizacion/estado${q}`);
      const propias = filas.filter((f) => f.entidad === entidad);
      const ultima = propias
        .filter((f) => f.ultimaSincronizacion)
        .sort((a, b) => (b.ultimaSincronizacion! > a.ultimaSincronizacion! ? 1 : -1))[0];
      setEstado(ultima ?? propias[0] ?? null);
    } catch {
      setEstado(null);
    }
  }, [compania, entidad]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function sincronizar() {
    setCargando(true);
    try {
      await api("/sincronizacion/solicitar", { metodo: "POST", cuerpo: { entidad, companiaId: compania } });
      toast.success("Sincronización solicitada.");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo solicitar la sincronización.");
    } finally {
      setCargando(false);
    }
  }

  const texto = !conApi
    ? "Modo demostración: datos locales sin sincronización con el ERP"
    : estado?.ultimaSincronizacion
      ? `Última sincronización con el ERP: ${formatear(estado.ultimaSincronizacion)}`
      : "Pendiente de sincronizar con el ERP (se muestran datos en línea)";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
      <span className="text-muted-foreground">
        {texto}
        {conApi && estado?.solicitadaEn ? ` · solicitud en curso desde ${formatear(estado.solicitadaEn)}` : ""}
      </span>
      {conApi ? (
        <Button variant="outline" size="sm" onClick={sincronizar} disabled={cargando} className="gap-1.5">
          <RefreshCw className={`size-4 ${cargando ? "animate-spin" : ""}`} /> Sincronizar ahora
        </Button>
      ) : null}
    </div>
  );
}
