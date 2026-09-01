import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CampoContrasena } from "@/components/comunes/CampoContrasena";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
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
import type { Perfil } from "@/data/tipos";

export const Route = createFileRoute("/usuarios/$usuarioId")({
  head: () => ({
    meta: [
      { title: "Mantenimiento de usuario | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Cree, edite, active o elimine usuarios del sistema de control de flujo de efectivo.",
      },
      { property: "og:title", content: "Mantenimiento de usuario | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Pantalla de edición de usuarios, perfiles y estado de acceso.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaUsuario,
});

const PERFILES: { valor: Perfil; etiqueta: string; detalle: string }[] = [
  {
    valor: "administrador",
    etiqueta: "Administrador",
    detalle: "Acceso total: catálogos, parámetros, usuarios y todos los registros.",
  },
  {
    valor: "registro",
    etiqueta: "Registro",
    detalle: "Registra facturas, pagos, erogaciones, contratos y pedidos.",
  },
  { valor: "consulta", etiqueta: "Consulta", detalle: "Solo lectura de tableros y reportes." },
];

function PaginaUsuario() {
  const { usuarioId } = useParams({ from: "/usuarios/$usuarioId" });
  const navigate = useNavigate();
  const { usuarios, usuario: sesion, esAdministrador, crearUsuario, actualizarUsuario, eliminarUsuario } =
    useApp();

  const esNuevo = usuarioId === "nuevo";
  const actual = useMemo(() => usuarios.find((u) => u.id === usuarioId), [usuarios, usuarioId]);

  const [nombre, setNombre] = useState(actual?.nombre ?? "");
  const [nombreUsuario, setNombreUsuario] = useState(actual?.nombreUsuario ?? "");
  const [correo, setCorreo] = useState(actual?.correo ?? "");
  const [perfil, setPerfil] = useState<Perfil>(actual?.perfil ?? "consulta");
  const [activo, setActivo] = useState(actual?.activo ?? true);
  const [contrasena, setContrasena] = useState("");
  const [guardando, setGuardando] = useState(false);

  const volver = () => void navigate({ to: "/acceso" });

  if (!esAdministrador) {
    return (
      <div className="space-y-6">
        <EncabezadoPagina
          titulo="Mantenimiento de usuario"
          descripcion="Solo el perfil administrador puede gestionar usuarios."
        />
        <Button variant="outline" onClick={volver} className="gap-1.5">
          <ArrowLeft className="size-4" /> Volver a usuarios
        </Button>
      </div>
    );
  }

  if (!esNuevo && !actual) {
    return (
      <div className="space-y-6">
        <EncabezadoPagina titulo="Usuario no encontrado" descripcion="El registro ya no existe." />
        <Button variant="outline" onClick={volver} className="gap-1.5">
          <ArrowLeft className="size-4" /> Volver a usuarios
        </Button>
      </div>
    );
  }

  const guardar = async () => {
    if (!nombre.trim() || !nombreUsuario.trim()) {
      toast.error("El nombre completo y el nombre de usuario son obligatorios.");
      return;
    }
    if (esNuevo && contrasena.length > 0 && contrasena.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setGuardando(true);
    try {
      if (esNuevo) {
        await crearUsuario({
          nombre: nombre.trim(),
          nombreUsuario: nombreUsuario.trim(),
          ...(correo.trim() ? { correo: correo.trim() } : {}),
          perfil,
          activo,
          ...(contrasena ? { contrasena } : {}),
        });
        toast.success("Usuario creado");
      } else {
        await actualizarUsuario(usuarioId, {
          nombre: nombre.trim(),
          nombreUsuario: nombreUsuario.trim(),
          correo: correo.trim(),
          perfil,
          activo,
          ...(contrasena ? { contrasena } : {}),
        });
        toast.success("Usuario actualizado");
      }
      volver();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el usuario");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async () => {
    if (!confirm("¿Eliminar este usuario? Si tiene movimientos registrados no será posible.")) return;
    setGuardando(true);
    try {
      await eliminarUsuario(usuarioId);
      toast.success("Usuario eliminado");
      volver();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar el usuario");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo={esNuevo ? "Nuevo usuario" : `Editar: ${actual?.nombre}`}
        requerimiento="RF-015"
        descripcion="Datos de acceso, perfil de permisos y estado del usuario."
        acciones={
          <Button variant="outline" size="sm" className="gap-1.5" onClick={volver}>
            <ArrowLeft className="size-4" /> Volver
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nombreUsuario">Nombre de usuario</Label>
              <Input
                id="nombreUsuario"
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="correo">Correo electrónico</Label>
              <Input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="perfil">Perfil</Label>
              <Select value={perfil} onValueChange={(v) => setPerfil(v as Perfil)}>
                <SelectTrigger id="perfil">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERFILES.map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>
                      {p.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="contrasena">
                {esNuevo ? "Contraseña inicial (opcional)" : "Nueva contraseña (dejar vacío para no cambiar)"}
              </Label>
              <CampoContrasena
                id="contrasena"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium">Usuario activo</p>
              <p className="text-xs text-muted-foreground">
                Un usuario inactivo conserva su historial pero no puede iniciar sesión.
              </p>
            </div>
            <Switch checked={activo} onCheckedChange={setActivo} />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={() => void guardar()} disabled={guardando} className="gap-1.5">
              <Save className="size-4" /> Guardar
            </Button>
            {!esNuevo ? (
              <Button
                variant="destructive"
                onClick={() => void borrar()}
                disabled={guardando || usuarioId === sesion.id}
                className="gap-1.5"
              >
                <Trash2 className="size-4" /> Eliminar
              </Button>
            ) : null}
          </div>
          {!esNuevo && usuarioId === sesion.id ? (
            <p className="text-xs text-muted-foreground">
              No es posible eliminar el usuario con el que está trabajando.
            </p>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <p className="text-sm font-medium">Alcance de los perfiles</p>
          {PERFILES.map((p) => (
            <div key={p.valor} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium">{p.etiqueta}</p>
              <p className="text-xs text-muted-foreground">{p.detalle}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
