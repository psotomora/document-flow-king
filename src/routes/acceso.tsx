import { createFileRoute } from "@tanstack/react-router";
import { Check, RotateCcw, X } from "lucide-react";
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
import { useApp, usuariosDemo } from "@/contexto/AppContexto";
import type { Perfil } from "@/data/tipos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/acceso")({
  head: () => ({
    meta: [
      { title: "Usuarios y perfiles | Flujo de Efectivo Aplix" },
      {
        name: "description",
        content:
          "Perfiles administrador, registro y consulta con sus permisos simulados dentro de la maqueta.",
      },
      { property: "og:title", content: "Usuarios y perfiles | Flujo de Efectivo Aplix" },
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
  const { usuario, cambiarUsuario, reiniciar } = useApp();

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Usuarios y perfiles"
        requerimiento="RF-015"
        descripcion="Maqueta sin autenticación real: cambie de usuario para ver cómo se comporta la interfaz con cada perfil."
        acciones={
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
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {usuariosDemo.map((u) => {
          const activo = u.id === usuario.id;
          return (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                cambiarUsuario(u.id);
                toast.success(`Sesión simulada como ${u.nombre}`);
              }}
              className={cn(
                "rounded-lg border p-4 text-left transition-colors",
                activo
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <p className="font-medium">{u.nombre}</p>
              <p className="text-sm text-muted-foreground capitalize">Perfil: {u.perfil}</p>
              {activo ? (
                <p className="mt-2 text-xs font-medium text-primary">Sesión activa</p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Cambiar a este usuario</p>
              )}
            </button>
          );
        })}
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
