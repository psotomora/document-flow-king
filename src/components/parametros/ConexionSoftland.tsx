import { useCallback, useEffect, useState } from "react";
import { Loader2, PlugZap, Save } from "lucide-react";
import { toast } from "sonner";
import { CampoContrasena } from "@/components/comunes/CampoContrasena";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/contexto/AppContexto";
import type { ConexionSoftland as Conexion } from "@/data/tipos";
import { api } from "@/lib/api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { presentarPruebaAgente, TEXTO_AYUDA_PRUEBA_AGENTE, type PruebaAgente } from "@/lib/prueba-agente";

const VACIA: Conexion = {
  fuente: "SoftlandERP",
  servidor: "",
  baseDatos: "",
  esquema: "",
  usuario: "",
  tieneClave: false,
  companiaId: null,
  encriptar: true,
};

/**
 * Credenciales de la base de datos de SoftlandERP (tablas PEDIDO, PEDIDO_LINEA, FACTURA y FACTURA_LINEA).
 * Solo el administrador puede verlas y modificarlas; la clave se guarda cifrada
 * en la base de datos y nunca se devuelve al navegador.
 */
export function ConexionSoftland({
  habilitado,
  fuente = "softland",
  titulo = "Conexión 1 a fuente externa",
  porAgente = false,
}: {
  /** Empresa cliente: la nube no llega a su SQL; la validación la hace el agente local. */
  porAgente?: boolean;
  habilitado: boolean;
  /** Clave de la conexión: "softland" (1) o "softland2" (2). */
  fuente?: "softland" | "softland2";
  titulo?: string;
}) {
  const ruta = `/fuentes-externas/${fuente}`;
  const idc = (n: string) => `${fuente}-${n}`;
  const { modoApi, esAdministrador, companias, recargar } = useApp();
  const [datos, setDatos] = useState<Conexion>(VACIA);
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [prueba, setPrueba] = useState<PruebaAgente | null>(null);

  const leerPrueba = useCallback(async () => {
    try {
      setPrueba(await api<PruebaAgente>(`${ruta}/prueba-agente`));
    } catch {
      /* API anterior sin comprobación por agente */
    }
  }, [ruta]);

  useEffect(() => {
    if (porAgente && modoApi && esAdministrador) void leerPrueba();
  }, [porAgente, modoApi, esAdministrador, leerPrueba]);

  // Mientras el agente no responda, se consulta el estado cada 5 segundos.
  useEffect(() => {
    if (prueba?.estado !== "en_proceso") return;
    const t = window.setInterval(() => void leerPrueba(), 5000);
    return () => window.clearInterval(t);
  }, [prueba?.estado, leerPrueba]);

  useEffect(() => {
    if (!modoApi || !esAdministrador) return;
    setCargando(true);
    api<Conexion>(ruta)
      .then((c) => setDatos({ ...VACIA, ...c }))
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "No se pudo leer la conexión externa"),
      )
      .finally(() => setCargando(false));
  }, [modoApi, esAdministrador, ruta]);

  const cuerpo = () => ({
    servidor: datos.servidor,
    baseDatos: datos.baseDatos,
    esquema: datos.esquema,
    usuario: datos.usuario,
    // Solo se envía la clave cuando el usuario digita una nueva.
    clave: clave.length > 0 ? clave : undefined,
    companiaId: datos.companiaId ?? undefined,
    encriptar: datos.encriptar,
  });

  const bloqueado = !habilitado || !esAdministrador || !modoApi;
  const incompleta = !datos.servidor.trim() || !datos.baseDatos.trim() || !datos.esquema.trim();

  const probar = async () => {
    setProbando(true);
    setResultado(null);
    try {
      const r = await api<{ mensaje: string; pedidos: number }>(
        `${ruta}/probar`,
        { metodo: "POST", cuerpo: cuerpo() },
      );
      setResultado({ ok: true, mensaje: r.mensaje });
    } catch (e) {
      setResultado({ ok: false, mensaje: e instanceof Error ? e.message : "Falló la prueba" });
    } finally {
      setProbando(false);
    }
  };

  const guardarSolo = async () => {
    await api(ruta, { metodo: "PUT", cuerpo: cuerpo() });
    setDatos((d) => ({ ...d, tieneClave: d.tieneClave || clave.length > 0 }));
    setClave("");
  };

  const guardarAgente = async () => {
    setGuardando(true);
    setResultado(null);
    try {
      await guardarSolo();
      toast.success("Conexión guardada.");
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la conexión");
    } finally {
      setGuardando(false);
    }
  };

  const probarAgente = async () => {
    setProbando(true);
    setResultado(null);
    try {
      await guardarSolo();
      setPrueba(await api<PruebaAgente>(`${ruta}/probar-agente`, { metodo: "POST" }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo solicitar la comprobación");
    } finally {
      setProbando(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setResultado(null);
    try {
      const solicitud = cuerpo();
      const prueba = await api<{ mensaje: string; pedidos: number }>(
        `${ruta}/probar`,
        { metodo: "POST", cuerpo: solicitud },
      );
      await api(ruta, { metodo: "PUT", cuerpo: solicitud });
      setResultado({ ok: true, mensaje: prueba.mensaje });
      toast.success("Conexión comprobada y guardada.");
      setClave("");
      setDatos((d) => ({ ...d, tieneClave: d.tieneClave || clave.length > 0 }));
      await recargar();
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "No se pudo guardar la conexión";
      setResultado({ ok: false, mensaje });
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const campo = (k: keyof Conexion) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDatos((d) => ({ ...d, [k]: e.target.value }));

  return (
    <div
      className={`mt-4 space-y-4 border-l-2 border-border pl-4 ${habilitado ? "" : "opacity-50"}`}
    >
      <div>
        <p className="text-sm font-medium text-foreground">{titulo}</p>
        <p className="text-xs text-muted-foreground">
          Base de datos de la que se leen las tablas PEDIDO, PEDIDO_LINEA, FACTURA y FACTURA_LINEA. El esquema corresponde a
          la compañía dentro del ERP (por ejemplo <code>capa</code>). La clave se guarda cifrada y
          cada cambio queda en la bitácora.
        </p>
        {!modoApi ? (
          <p className="mt-1 text-xs text-advertencia">
            Disponible únicamente cuando la aplicación está conectada a SQL Server.
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor={idc("servidor")}>Servidor</Label>
          <Input
            id={idc("servidor")}
            placeholder="SERVIDOR\INSTANCIA o host,puerto"
            value={datos.servidor}
            onChange={campo("servidor")}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={idc("base")}>Base de datos</Label>
          <Input
            id={idc("base")}
            placeholder="Softland"
            value={datos.baseDatos}
            onChange={campo("baseDatos")}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={idc("esquema")}>Esquema (compañía Softland)</Label>
          <Input
            id={idc("esquema")}
            placeholder="capa"
            value={datos.esquema}
            onChange={campo("esquema")}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={idc("usuario")}>Usuario SQL</Label>
          <Input
            id={idc("usuario")}
            placeholder="Vacío = autenticación de Windows"
            value={datos.usuario}
            onChange={campo("usuario")}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={idc("clave")}>Clave</Label>
          <CampoContrasena
            id={idc("clave")}
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder={datos.tieneClave ? "•••••••• (guardada; escriba para cambiar)" : ""}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={idc("compania")}>Compañía en esta aplicación</Label>
          <Select
            value={datos.companiaId ?? ""}
            onValueChange={(v) => setDatos((d) => ({ ...d, companiaId: v }))}
            disabled={bloqueado || cargando}
          >
            <SelectTrigger id={idc("compania")}>
              <SelectValue placeholder="Seleccione la compañía" />
            </SelectTrigger>
            <SelectContent>
              {companias.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.codigo} · {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id={idc("encriptar")}
            checked={datos.encriptar}
            onCheckedChange={(v) => setDatos((d) => ({ ...d, encriptar: v }))}
            disabled={bloqueado || cargando}
          />
          <Label htmlFor={idc("encriptar")} className="text-xs">
            Cifrar conexión (Encrypt)
          </Label>
        </div>
        {porAgente ? (
          <div className="ml-auto flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={probarAgente}
                      disabled={bloqueado || cargando || probando || incompleta || prueba?.estado === "en_proceso"}
                    >
                      {probando ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                      Probar conexión
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">{TEXTO_AYUDA_PRUEBA_AGENTE}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={guardarAgente}
              disabled={bloqueado || cargando || guardando || incompleta}
            >
              {guardando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Guardar
            </Button>
          </div>
        ) : (
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={probar}
            disabled={bloqueado || cargando || probando || incompleta}
          >
            {probando ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
            Probar conexión
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={guardar}
            disabled={bloqueado || cargando || guardando || incompleta}
          >
            {guardando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Probar y guardar
          </Button>
        </div>
        )}
      </div>

      {porAgente ? (() => {
        const vista = presentarPruebaAgente(prueba);
        if (!vista) return null;
        const clases =
          vista.tono === "proceso"
            ? "border-primary/40 bg-primary/10 text-primary"
            : vista.tono === "exito"
              ? "border-exito/40 bg-exito-suave text-exito"
              : "border-destructive/40 bg-destructive-suave text-destructive";
        return (
          <div role="status" className={`rounded-md border px-3 py-2 text-xs ${clases}`}>
            <p className="flex items-center gap-1.5 font-medium">
              {vista.tono === "proceso" ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {vista.etiqueta}
            </p>
            {vista.tono === "proceso" ? (
              <p className="mt-0.5">Esperando que el agente local valide las credenciales…</p>
            ) : prueba?.mensaje ? (
              <p className="mt-0.5">{prueba.mensaje}</p>
            ) : null}
          </div>
        );
      })() : null}

      {resultado ? (
        <p
          role="status"
          className={`rounded-md border px-3 py-2 text-xs ${
            resultado.ok
              ? "border-exito/40 bg-exito-suave text-exito"
              : "border-destructive/40 bg-destructive-suave text-destructive"
          }`}
        >
          {resultado.mensaje}
        </p>
      ) : null}
    </div>
  );
}
