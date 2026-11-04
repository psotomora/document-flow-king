import { useApp } from "@/contexto/AppContexto";
import { verificarConexion } from "@/lib/estado-conexion";
import { fechaUtc } from "@/lib/estado-softland";
import { useEstadoConexion } from "@/hooks/use-estado-conexion";
import { cn } from "@/lib/utils";

export function IndicadorConexion() {
  const { modoApi, companias, companiaActiva } = useApp();
  const { data: propios, ahora } = useEstadoConexion();

  if (!modoApi) return <span className="text-xs text-muted-foreground">Modo demostración</span>;
  const visibles = companias.filter((c) => companiaActiva === "todas" || c.id === companiaActiva);
  const sinConexion = visibles.every((c) => !propios?.conexiones?.some((x) => String(x.companiaId) === c.id));
  const agente = propios?.agente;
  const verAgente = agente && sinConexion
    ? verificarConexion("agente", visibles[0]?.id ?? null, propios?.verificaciones ?? [], agente, ahora) : null;
  const estadoAgente = verAgente?.estado ?? "pendiente";
  return (
    <div role="status" aria-label="Estado de conexión con Softland" className="flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-xs">
      {visibles.filter(() => !verAgente).map((c) => {
        const conexion = propios?.conexiones?.find((x) => String(x.companiaId) === c.id);
        const verificacion = conexion ? verificarConexion(conexion.modo, c.id, propios?.verificaciones ?? [], propios?.agente ?? null, ahora) : null;
        const error = propios && (propios.conexiones === null || (conexion?.modo === "directa" && propios.verificaciones === null));
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
        <span className="mt-0.5 block text-muted-foreground">Última verificación: {verAgente.fecha && Number.isFinite(fechaUtc(verAgente.fecha)) ? new Date(fechaUtc(verAgente.fecha)).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" }) : "sin registrar"}</span>
      </div> : null}
    </div>
  );
}