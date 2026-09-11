import { useEffect, useState } from "react";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { CampoContrasena } from "@/components/comunes/CampoContrasena";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useApp } from "@/contexto/AppContexto";
import type { ConfiguracionCorreo } from "@/data/tipos";
import { api } from "@/lib/api";

const VACIA: ConfiguracionCorreo = {
  servidor: "",
  puerto: 587,
  ssl: true,
  usuario: "",
  tieneClave: false,
  remitente: "",
  nombreRemitente: "",
  copiaOculta: "",
};

/**
 * Datos del servidor SMTP con el que se envían los estados de cuenta.
 * Solo el administrador puede verlos y modificarlos; la contraseña se guarda
 * cifrada en la base de datos y nunca se devuelve al navegador.
 */
export function ServidorCorreo() {
  const { modoApi, esAdministrador, usuario } = useApp();
  const [datos, setDatos] = useState<ConfiguracionCorreo>(VACIA);
  const [clave, setClave] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [cargando, setCargando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);

  useEffect(() => {
    if (!modoApi || !esAdministrador) return;
    setCargando(true);
    api<ConfiguracionCorreo>("/correo/smtp")
      .then((c) => setDatos({ ...VACIA, ...c }))
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : "No se pudo leer el servidor de correo"),
      )
      .finally(() => setCargando(false));
  }, [modoApi, esAdministrador]);

  const cuerpo = () => ({
    servidor: datos.servidor,
    puerto: Number(datos.puerto) || 587,
    ssl: datos.ssl,
    usuario: datos.usuario,
    // Solo se envía la contraseña cuando el usuario digita una nueva.
    clave: clave.length > 0 ? clave : undefined,
    remitente: datos.remitente,
    nombreRemitente: datos.nombreRemitente,
    copiaOculta: datos.copiaOculta,
    destinatario: destinatario.trim() || undefined,
  });

  const bloqueado = !esAdministrador || !modoApi;
  const incompleta = !datos.servidor.trim() || !datos.remitente.trim();

  const enviarPrueba = async () => {
    setProbando(true);
    setResultado(null);
    try {
      const r = await api<{ mensaje: string }>("/correo/smtp/probar", {
        metodo: "POST",
        cuerpo: cuerpo(),
      });
      setResultado({ ok: true, mensaje: r.mensaje });
      toast.success("Correo de prueba enviado.");
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "No fue posible enviar el correo de prueba";
      setResultado({ ok: false, mensaje });
    } finally {
      setProbando(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setResultado(null);
    try {
      await api("/correo/smtp", { metodo: "PUT", cuerpo: cuerpo() });
      setResultado({ ok: true, mensaje: "Servidor de correo guardado." });
      toast.success("Servidor de correo guardado.");
      setClave("");
      setDatos((d) => ({ ...d, tieneClave: d.tieneClave || clave.length > 0 }));
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "No se pudo guardar el servidor de correo";
      setResultado({ ok: false, mensaje });
      toast.error(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const campo =
    (k: keyof ConfiguracionCorreo) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setDatos((d) => ({ ...d, [k]: e.target.value }));

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Servidor de correo (SMTP)</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Datos con los que la aplicación envía los estados de cuenta. La contraseña se guarda cifrada
        y cada cambio queda en la bitácora. Puerto 587 con conexión segura (TLS) es lo habitual;
        el puerto 465 no está soportado.
      </p>
      {!modoApi ? (
        <p className="mt-1 text-xs text-advertencia">
          Disponible únicamente cuando la aplicación está conectada a SQL Server.
        </p>
      ) : null}
      {!esAdministrador ? (
        <p className="mt-1 text-xs text-advertencia">
          El usuario {usuario.nombre} no tiene perfil administrador; esta sección es de solo lectura.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="smtp-servidor">Servidor SMTP</Label>
          <Input
            id="smtp-servidor"
            placeholder="smtp.office365.com"
            value={datos.servidor}
            onChange={campo("servidor")}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-puerto">Puerto</Label>
          <Input
            id="smtp-puerto"
            type="number"
            placeholder="587"
            value={String(datos.puerto)}
            onChange={(e) => setDatos((d) => ({ ...d, puerto: Number(e.target.value) }))}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-usuario">Usuario</Label>
          <Input
            id="smtp-usuario"
            placeholder="Vacío = servidor sin autenticación"
            value={datos.usuario}
            onChange={campo("usuario")}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-clave">Contraseña</Label>
          <CampoContrasena
            id="smtp-clave"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder={datos.tieneClave ? "•••••••• (guardada; escriba para cambiar)" : ""}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-remitente">Correo remitente</Label>
          <Input
            id="smtp-remitente"
            placeholder="estados@miempresa.com"
            value={datos.remitente}
            onChange={campo("remitente")}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-nombre">Nombre del remitente</Label>
          <Input
            id="smtp-nombre"
            placeholder="Aplix Cash Flow Insights"
            value={datos.nombreRemitente}
            onChange={campo("nombreRemitente")}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="smtp-bcc">Copia oculta (opcional)</Label>
          <Input
            id="smtp-bcc"
            placeholder="contabilidad@miempresa.com; gerencia@miempresa.com"
            value={datos.copiaOculta}
            onChange={campo("copiaOculta")}
            disabled={bloqueado || cargando}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="smtp-prueba">Enviar prueba a</Label>
          <Input
            id="smtp-prueba"
            placeholder="Vacío = al mismo remitente"
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            disabled={bloqueado || cargando}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="smtp-ssl"
            checked={datos.ssl}
            onCheckedChange={(v) => setDatos((d) => ({ ...d, ssl: v }))}
            disabled={bloqueado || cargando}
          />
          <Label htmlFor="smtp-ssl" className="text-xs">
            Conexión segura (TLS)
          </Label>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={enviarPrueba}
            disabled={bloqueado || cargando || probando || incompleta}
          >
            {probando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar correo de prueba
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={guardar}
            disabled={bloqueado || cargando || guardando || incompleta}
          >
            {guardando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Guardar
          </Button>
        </div>
      </div>

      {resultado ? (
        <p
          role="status"
          className={`mt-3 rounded-md border px-3 py-2 text-xs ${
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
