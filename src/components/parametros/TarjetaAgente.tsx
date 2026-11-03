import { useCallback, useEffect, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, hayApi } from "@/lib/api";

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
  const [estado, setEstado] = useState<EstadoAgente | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [conApi, setConApi] = useState(false);

  const cargar = useCallback(async () => {
    if (!hayApi()) return;
    try {
      setEstado(await api<EstadoAgente>("/agente/estado"));
    } catch {
      setEstado(null);
    }
  }, []);

  useEffect(() => {
    setConApi(hayApi());
    void cargar();
    const t = setInterval(() => void cargar(), 30000);
    return () => clearInterval(t);
  }, [cargar]);

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
    ok ? "bg-success" : ok === false ? "bg-destructive" : "bg-muted-foreground";

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
              <span className={`size-2.5 rounded-full ${color(estado?.softlandOk)}`} />
              <span>
                {estado?.softlandOk ? "Conexión a Softland verificada" : estado?.softlandOk === false ? "Error de conexión a Softland" : "Sin diagnóstico de Softland"}
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
            <Button variant="outline" size="sm" onClick={generar} className="gap-1.5">
              <KeyRound className="size-4" /> {estado?.tokenConfigurado ? "Regenerar token" : "Generar token"}
            </Button>
          </div>
          {token ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Copie este token en el appsettings.json del agente. No se volverá a mostrar.</p>
              <Input readOnly value={token} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
