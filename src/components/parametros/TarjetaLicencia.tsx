import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/contexto/AppContexto";
import {
  cargarLicencia,
  estadoLicencia,
  exigirLicencia,
  licenciaDisponible,
  type EstadoLicencia,
} from "@/lib/licencia";

const ETIQUETAS: Record<string, { texto: string; clase: string }> = {
  vigente: { texto: "Vigente", clase: "bg-emerald-100 text-emerald-800" },
  porVencer: { texto: "Por vencer", clase: "bg-amber-100 text-amber-900" },
  gracia: { texto: "En periodo de gracia", clase: "bg-orange-100 text-orange-900" },
  bloqueada: { texto: "Bloqueada", clase: "bg-destructive/15 text-destructive" },
  ausente: { texto: "Sin licencia", clase: "bg-destructive/15 text-destructive" },
  libre: { texto: "Licenciamiento desactivado", clase: "bg-muted text-muted-foreground" },
};

/** Estado de la licencia del sistema, carga del archivo .lic y activación del control. */
export function TarjetaLicencia() {
  const { esAdministrador } = useApp();
  const [estado, setEstado] = useState<EstadoLicencia | null>(null);
  const [cargando, setCargando] = useState(false);
  const archivoRef = useRef<HTMLInputElement>(null);

  const refrescar = async () => {
    if (!licenciaDisponible()) return;
    try {
      setEstado(await estadoLicencia());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible leer la licencia.");
    }
  };

  useEffect(() => {
    void refrescar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!licenciaDisponible()) return null;

  const seleccionar = async (archivo: File | undefined) => {
    if (!archivo) return;
    setCargando(true);
    try {
      const texto = (await archivo.text()).trim();
      setEstado(await cargarLicencia(texto));
      toast.success("Licencia cargada correctamente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible cargar la licencia.");
    } finally {
      setCargando(false);
      if (archivoRef.current) archivoRef.current.value = "";
    }
  };

  const cambiarExigencia = async (activa: boolean) => {
    setCargando(true);
    try {
      setEstado(await exigirLicencia(activa));
      toast.success(activa ? "El sistema exigirá licencia válida." : "Control de licencia desactivado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible cambiar el parámetro.");
    } finally {
      setCargando(false);
    }
  };

  const etiqueta = ETIQUETAS[estado?.estado ?? "libre"] ?? ETIQUETAS["libre"]!;

  return (
    <>
      <h2 className="text-sm font-semibold text-foreground">Licencia del sistema</h2>
      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${etiqueta.clase}`}>
            {etiqueta.texto}
          </span>
          {estado?.clienteNombre ? (
            <span className="text-sm text-foreground">{estado.clienteNombre}</span>
          ) : null}
          {estado?.vence ? (
            <span className="text-xs text-muted-foreground">Vence el {estado.vence}</span>
          ) : null}
        </div>

        {estado?.mensaje ? (
          <p className="text-xs text-muted-foreground">{estado.mensaje}</p>
        ) : null}

        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-medium text-foreground">Huella de este servidor</dt>
            <dd className="font-mono text-muted-foreground">{estado?.huella ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Usuarios activos</dt>
            <dd className="text-muted-foreground">
              {estado?.usuariosActivos ?? 0}
              {estado?.maxUsuarios ? ` de ${estado.maxUsuarios} permitidos` : " (sin límite)"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Compañías autorizadas</dt>
            <dd className="text-muted-foreground">
              {estado?.companias?.length ? estado.companias.join(", ") : "Todas"}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-foreground">Serie</dt>
            <dd className="font-mono text-muted-foreground">{estado?.serie || "—"}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <input
            ref={archivoRef}
            type="file"
            accept=".lic,text/plain"
            className="hidden"
            onChange={(e) => void seleccionar(e.target.files?.[0])}
          />
          <Button
            size="sm"
            disabled={!esAdministrador || cargando}
            onClick={() => archivoRef.current?.click()}
          >
            Cargar archivo de licencia
          </Button>
          <Button size="sm" variant="outline" disabled={cargando} onClick={() => void refrescar()}>
            Actualizar estado
          </Button>
          {estado?.huella ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void navigator.clipboard.writeText(estado.huella);
                toast.success("Huella copiada.");
              }}
            >
              Copiar huella
            </Button>
          ) : null}
          {estado?.emisor ? (
            <Button size="sm" variant="secondary" asChild>
              <Link to="/licencias">Emitir licencias</Link>
            </Button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-foreground">Exigir licencia válida</p>
            <p className="text-xs text-muted-foreground">
              Al activarlo, el sistema deja de operar cuando la licencia vence (después del periodo
              de gracia), pertenece a otro servidor o no está instalada.
            </p>
          </div>
          <Switch
            checked={estado?.requerida ?? false}
            disabled={!esAdministrador || cargando}
            onCheckedChange={(v) => void cambiarExigencia(v)}
          />
        </div>

        {estado && !estado.hayLlavePublica ? (
          <p className="text-xs text-destructive">
            Falta configurar la llave pública de licencias (Licencia:LlavePublica en appsettings de
            la API). Sin ella no es posible validar ningún archivo.
          </p>
        ) : null}
      </div>
    </>
  );
}
