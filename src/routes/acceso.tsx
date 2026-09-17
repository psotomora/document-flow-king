import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Check, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexto/AppContexto";
import type { Perfil } from "@/data/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/acceso")({
  head: () => ({
    meta: [
      { title: "Usuarios y perfiles | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Perfiles administrador, registro y consulta con sus permisos simulados dentro de la maqueta.",
      },
      { property: "og:title", content: "Usuarios y perfiles | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Control de acceso por perfil para el sistema de flujo de efectivo.",
      },
    ],
  }),
  component: PaginaAcceso,
});

const PERMISOS: { accion: string; permitido: Record<Perfil, boolean> }[] = [
  { accion: "Consultar tableros y reportes", permitido: { administrador: true, registro: true, consulta: true } },
  { accion: "Exportar a Excel y PDF", permitido: { administrador: true, registro: true, consulta: true } },
  { accion: "Registrar facturas, pagos y erogaciones", permitido: { administrador: true, registro: true, consulta: false } },
  { accion: "Administrar contratos y pedidos", permitido: { administrador: true, registro: true, consulta: false } },
  { accion: "Modificar catálogos de bancos", permitido: { administrador: true, registro: false, consulta: false } },
  { accion: "Actualizar el tipo de cambio", permitido: { administrador: true, registro: false, consulta: false } },
  { accion: "Ejecutar la carga inicial", permitido: { administrador: true, registro: true, consulta: false } },
];

function PaginaAcceso() {
  const { usuario, usuarios, cambiarUsuario, reiniciar, esAdministrador, modoApi } = useApp();

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Usuarios y perfiles"
        requerimiento="RF-015"
        descripcion="Mantenimiento de usuarios: creación, edición, activación y eliminación, con sus perfiles de permisos."
        acciones={
          <div className="flex flex-wrap gap-2">
            {esAdministrador ? (
              <Button size="sm" className="gap-1.5" asChild>
                <Link to="/usuarios/$usuarioId" params={{ usuarioId: "nuevo" }}>
                  <Plus className="size-4" /> Nuevo usuario
                </Link>
              </Button>
            ) : null}
            {!modoApi ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  reiniciar();
                  toast.success("Datos de demostración restablecidos");
                }}
              >
                <RotateCcw className="size-4" /> Reiniciar datos de demostración
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u.id} className={cn(u.id === usuario.id && "bg-primary/5")}>
                <TableCell className="font-medium">
                  {u.nombre}
                  {u.id === usuario.id ? (
                    <span className="ml-2 text-xs text-primary">(sesión activa)</span>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-xs">{u.nombreUsuario ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{u.correo ?? "—"}</TableCell>
                <TableCell className="capitalize">{u.perfil}</TableCell>
                <TableCell>
                  <Badge variant={u.activo === false ? "outline" : "secondary"}>
                    {u.activo === false ? "Inactivo" : "Activo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {!modoApi && u.id !== usuario.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          cambiarUsuario(u.id);
                          toast.success(`Sesión simulada como ${u.nombre}`);
                        }}
                      >
                        Usar perfil
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                      <Link to="/usuarios/$usuarioId" params={{ usuarioId: u.id }}>
                        <Pencil className="size-4" /> Editar
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acción</TableHead>
              <TableHead className="text-center">Administrador</TableHead>
              <TableHead className="text-center">Registro</TableHead>
              <TableHead className="text-center">Consulta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISOS.map((p) => (
              <TableRow key={p.accion}>
                <TableCell className="font-medium">{p.accion}</TableCell>
                {(["administrador", "registro", "consulta"] as Perfil[]).map((perfil) => (
                  <TableCell key={perfil} className="text-center">
                    {p.permitido[perfil] ? (
                      <Check className="mx-auto size-4 text-exito" aria-label="Permitido" />
                    ) : (
                      <X className="mx-auto size-4 text-muted-foreground" aria-label="No permitido" />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
