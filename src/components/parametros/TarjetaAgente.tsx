import { useCallback, useEffect, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, hayApi } from "@/lib/api";
import { useApp } from "@/contexto/AppContexto";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { estadoSoftland } from "@/lib/estado-softland";

interface ConexionErp { companiaId: number; modo: "directa" | "agente"; intervaloMinutos: number }

interface EstadoAgente {
  tokenConfigurado: boolean;
  ultimoLatido: string | null;
  versionAgente: string | null;
  equipo: string | null;
  ultimoDiagnostico: string | null;
  softlandOk: boolean | null;
  softlandLatenciaMs: number | null;
  softlandMensaje: string | null;
  enLinea: boolean;
}

function formatear(utc: string | null): string {
  if (!utc) return "—";
  const f = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(utc) ? utc : `${utc}Z`);
  return f.toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
}

/** Fase 2 SaaS: estado del agente local y su conexión con Softland. */
export function TarjetaAgente() {
  const { modoApi, esAdministrador, companias, companiaActiva, recargar } = useApp();
  const [estado, setEstado] = useState<EstadoAgente | null>(null);
  const [conexiones, setConexiones] = useState<ConexionErp[]>([]);
  const [compania, setCompania] = useState(companiaActiva === "todas" ? companias[0]?.id ?? "" : companiaActiva);
  const [guardando, setGuardando] = useState(false);
  const [intervalo, setIntervalo] = useState("5");
  const [ahora, setAhora] = useState(() => Date.now());
  const [token, setToken] = useState<string | null>(null);
  const [conApi, setConApi] = useState(false);

  const cargar = useCallback(async () => {
    if (!modoApi || !hayApi()) return;
    try {
      setEstado(await api<EstadoAgente>("/agente/estado"));
      setConexiones(await api<ConexionErp[]>("/sincronizacion/conexiones"));
    } catch {
      setEstado(null);
    }
  }, [modoApi]);

  useEffect(() => {
    setConApi(modoApi && hayApi());
    void cargar();
    const t = setInterval(() => void cargar(), 30000);
    return () => clearInterval(t);
  }, [cargar]);

  const conexion = conexiones.find((c) => String(c.companiaId) === compania);
  useEffect(() => setIntervalo(String(conexion?.intervaloMinutos ?? 5)), [conexion?.intervaloMinutos, compania]);
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t); }, []);
  async function guardar(modo: "directa" | "agente") {
    if (!conexion || !esAdministrador) return;
    setGuardando(true);
    try {
      await api(`/sincronizacion/conexiones/${compania}`, { metodo: "PUT", cuerpo: { modo, intervaloMinutos: Number(intervalo) } });
      await cargar();
      await recargar();
      toast.success("Modo de conexión ERP actualizado.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar."); }
    finally { setGuardando(false); }
  }
  const verificacion = estadoSoftland(estado?.ultimoDiagnostico ?? null, estado?.softlandOk ?? null, ahora);

  async function generar() {
    if (estado?.tokenConfigurado && !confirm("Se generará un token nuevo y el agente actual dejará de conectarse hasta actualizarlo. ¿Continuar?")) return;
    try {
      const r = await api<{ token: string }>("/agente/token", { metodo: "POST" });
      setToken(r.token);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo generar el token.");
    }
  }

  const color = (ok: boolean | null | undefined) =>
    ok ? "bg-exito" : ok === false ? "bg-destructive" : "bg-muted-foreground";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Agente local (Softland)</h2>
        {conApi ? (
          <Button variant="ghost" size="sm" onClick={() => void cargar()} className="gap-1.5">
            <RefreshCw className="size-4" /> Actualizar
          </Button>
        ) : null}
      </div>
      {!conApi ? (
        <p className="text-xs text-muted-foreground">Modo demostración: el agente se monitorea al conectar con la API.</p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${color(estado?.enLinea ?? null)}`} />
              <span>
                {estado?.enLinea ? "Agente en línea" : "Agente desconectado"}
                <span className="block text-xs text-muted-foreground">
                  Último contacto: {formatear(estado?.ultimoLatido ?? null)}
                  {estado?.versionAgente ? ` · v${estado.versionAgente}` : ""}
                  {estado?.equipo ? ` · ${estado.equipo}` : ""}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${color(verificacion === "exito" ? true : verificacion === "error" ? false : null)}`} />
              <span>
                {verificacion === "exito" ? "Conexión a Softland verificada" : verificacion === "error" ? "Softland: error o verificación vencida" : "Sin diagnóstico de Softland"}
                <span className="block break-words text-xs text-muted-foreground">
                  {formatear(estado?.ultimoDiagnostico ?? null)}
                  {estado?.softlandLatenciaMs != null ? ` · ${estado.softlandLatenciaMs} ms` : ""}
                  {estado?.softlandOk === false && estado.softlandMensaje ? ` · ${estado.softlandMensaje}` : ""}
                </span>
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              {estado?.tokenConfigurado ? "Token del agente configurado." : "Aún no se ha generado el token del agente."}
            </p>
            {esAdministrador ? <Button variant="outline" size="sm" onClick={generar} className="gap-1.5">
              <KeyRound className="size-4" /> {estado?.tokenConfigurado ? "Regenerar token" : "Generar token"}
            </Button> : null}
          </div>
          {token ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Copie este token en el appsettings.json del agente. No se volverá a mostrar.</p>
              <Input readOnly value={token} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            </div>
          ) : null}
          <div className="space-y-3 border-t border-border pt-3">
            <h3 className="text-sm font-semibold">Conexión ERP · Pedidos, facturas y contratos</h3>
            <div className="grid items-end gap-3 sm:grid-cols-3">
              <div className="min-w-0 space-y-1">
                <Label>Compañía</Label>
                <Select value={compania} onValueChange={setCompania}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{companias.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} · {c.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Modo de conexión</Label>
                <Select value={conexion?.modo ?? "directa"} onValueChange={(v) => void guardar(v as "directa" | "agente")} disabled={!esAdministrador || !conexion || guardando}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="directa">Conexión directa</SelectItem><SelectItem value="agente">Agente de sincronización</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="intervalo-agente">Intervalo (minutos)</Label>
                <div className="flex gap-2">
                  <Input id="intervalo-agente" type="number" min={1} max={1440} value={intervalo} onChange={(e) => setIntervalo(e.target.value)} disabled={!esAdministrador || !conexion || guardando} />
                  <Button variant="outline" size="icon" aria-label="Guardar intervalo" title="Guardar intervalo" onClick={() => void guardar(conexion?.modo ?? "directa")} disabled={!esAdministrador || !conexion || guardando}><RefreshCw className="size-4" /></Button>
                </div>
              </div>
            </div>
            {!conexion ? <p className="text-xs text-destructive">Compañía sin configuración de Fase 3. Ejecute el script SQL 20.</p> : null}
          </div>
        </div>
      )}
    </div>
  );
}
