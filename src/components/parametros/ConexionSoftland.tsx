import { useEffect, useState } from "react";
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
}: {
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
      </div>

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
