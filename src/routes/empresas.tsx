import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Loader2, LogIn, PlugZap, RefreshCw, Wrench } from "lucide-react";
import { fijarEmpresaTrabajo } from "@/lib/empresa";
import { toast } from "sonner";
import { useApp } from "@/contexto/AppContexto";
import {
  actualizarCliente,
  aprovisionarCliente,
  crearCliente,
  listarClientes,
  probarCliente,
  type ClienteSaaS,
  type DatosCliente,
} from "@/lib/clientes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas atendidas | Consola Aplix" },
      {
        name: "description",
        content:
          "Alta y mantenimiento de las empresas atendidas por Aplix en el servicio de flujo de efectivo.",
      },
      { property: "og:title", content: "Empresas atendidas | Consola Aplix" },
      {
        property: "og:description",
        content: "Registro de empresas, base de datos y aprovisionamiento inicial.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaEmpresas,
});

const VACIO: DatosCliente = {
  codigo: "",
  nombre: "",
  servidor: "",
  baseDatos: "",
  usuario: "",
  clave: "",
  encriptar: true,
  activo: true,
};

function PaginaEmpresas() {
  const { usuario } = useApp();
  const esAplix = usuario?.perfil === "superadmin";
  const [clientes, setClientes] = useState<ClienteSaaS[]>([]);
  const [cargando, setCargando] = useState(false);
  const [trabajando, setTrabajando] = useState<number | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [datos, setDatos] = useState<DatosCliente>(VACIO);

  async function recargar() {
    setCargando(true);
    try {
      setClientes(await listarClientes());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible leer las empresas");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (esAplix) void recargar();
  }, [esAplix]);

  if (!esAplix) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta pantalla es exclusiva del personal de Aplix.
      </p>
    );
  }

  function nuevo() {
    setEditando(null);
    setDatos(VACIO);
    setAbierto(true);
  }

  function editar(c: ClienteSaaS) {
    setEditando(c.id);
    setDatos({
      codigo: c.codigo,
      nombre: c.nombre,
      servidor: c.servidor,
      baseDatos: c.baseDatos,
      usuario: c.usuario,
      clave: "",
      encriptar: c.encriptar,
      activo: c.activo,
    });
    setAbierto(true);
  }

  async function guardar() {
    try {
      if (editando === null) await crearCliente(datos);
      else await actualizarCliente(editando, datos);
      toast.success("Empresa guardada");
      setAbierto(false);
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible guardar");
    }
  }

  async function probar(c: ClienteSaaS) {
    setTrabajando(c.id);
    try {
      const r = await probarCliente(c.id);
      if (r.estado === "ok") toast.success(r.mensaje);
      else toast.warning(r.mensaje);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible conectar");
    } finally {
      setTrabajando(null);
    }
  }

  async function aprovisionar(c: ClienteSaaS) {
    setTrabajando(c.id);
    try {
      const r = await aprovisionarCliente(c.id);
      toast.success(r.mensaje);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible preparar la base");
    } finally {
      setTrabajando(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Empresas atendidas</h1>
          <p className="text-sm text-muted-foreground">
            Cada empresa tiene su propia base de datos; la información nunca se comparte entre ellas.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void recargar()} disabled={cargando}>
            {cargando ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="mr-2 size-4" aria-hidden />
            )}
            Actualizar
          </Button>
          <Button onClick={nuevo}>
            <Building2 className="mr-2 size-4" aria-hidden />
            Nueva empresa
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de empresas</CardTitle>
          <CardDescription>
            El código es el que la persona escribe al ingresar; no se muestra en ninguna lista pública.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Servidor</TableHead>
                <TableHead>Base de datos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.codigo}</TableCell>
                  <TableCell>{c.nombre}</TableCell>
                  <TableCell>{c.servidor}</TableCell>
                  <TableCell>{c.baseDatos}</TableCell>
                  <TableCell>
                    <Badge variant={c.activo ? "default" : "secondary"}>
                      {c.activo ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button size="sm" variant="ghost" onClick={() => editar(c)}>
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={trabajando === c.id}
                      onClick={() => void probar(c)}
                    >
                      <PlugZap className="mr-1 size-4" aria-hidden />
                      Probar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={trabajando === c.id}
                      onClick={() => void aprovisionar(c)}
                    >
                      <Wrench className="mr-1 size-4" aria-hidden />
                      Preparar base
                    </Button>
                    <Button
                      size="sm"
                      disabled={!c.activo}
                      onClick={() => {
                        fijarEmpresaTrabajo(c.id, c.nombre);
                        window.location.assign(import.meta.env.BASE_URL || "/");
                      }}
                    >
                      <LogIn className="mr-1 size-4" aria-hidden />
                      Trabajar aquí
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {clientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    Aún no hay empresas registradas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando === null ? "Nueva empresa" : "Editar empresa"}</DialogTitle>
            <DialogDescription>
              Datos de conexión de la base propia de la empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código</Label>
              <Input
                id="codigo"
                value={datos.codigo}
                onChange={(e) => setDatos({ ...datos, codigo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input
                id="nombre"
                value={datos.nombre}
                onChange={(e) => setDatos({ ...datos, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servidor">Servidor SQL</Label>
              <Input
                id="servidor"
                value={datos.servidor}
                onChange={(e) => setDatos({ ...datos, servidor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseDatos">Base de datos</Label>
              <Input
                id="baseDatos"
                value={datos.baseDatos}
                onChange={(e) => setDatos({ ...datos, baseDatos: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="usuarioSql">Usuario SQL</Label>
              <Input
                id="usuarioSql"
                value={datos.usuario ?? ""}
                onChange={(e) => setDatos({ ...datos, usuario: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="claveSql">Contraseña</Label>
              <Input
                id="claveSql"
                type="password"
                placeholder={editando === null ? "" : "Sin cambios"}
                value={datos.clave ?? ""}
                onChange={(e) => setDatos({ ...datos, clave: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="encriptar">Conexión cifrada</Label>
              <Switch
                id="encriptar"
                checked={datos.encriptar}
                onCheckedChange={(v) => setDatos({ ...datos, encriptar: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="activa">Activa</Label>
              <Switch
                id="activa"
                checked={datos.activo}
                onCheckedChange={(v) => setDatos({ ...datos, activo: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void guardar()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
