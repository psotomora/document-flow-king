import { createFileRoute } from "@tanstack/react-router";
import { Copy, KeyRound, Pencil, Plus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, hayApi } from "@/lib/api";
import { nivelCupo, useSesionSaas, type Empresa } from "@/lib/empresas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/empresas")({
  head: () => ({
    meta: [
      { title: "Empresas | Aplix Cash Flow Insights" },
      { name: "description", content: "Administración de empresas clientes, cupo de usuarios y tokens del agente." },
      { property: "og:title", content: "Empresas | Aplix Cash Flow Insights" },
      { property: "og:description", content: "Empresas clientes del servicio, con su cupo de usuarios y estado del agente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaEmpresas,
});

interface Formulario {
  id?: number;
  codigo: string;
  nombre: string;
  contacto: string;
  correo: string;
  maxUsuarios: string;
  maxCompanias: string;
  fechaVencimiento: string;
  activo: boolean;
  esPrincipal: boolean;
}

const VACIO: Formulario = {
  codigo: "",
  nombre: "",
  contacto: "",
  correo: "",
  maxUsuarios: "5",
  maxCompanias: "1",
  fechaVencimiento: "",
  activo: true,
  esPrincipal: false,
};

function mensaje(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

function PaginaEmpresas() {
  const sesion = useSesionSaas();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [form, setForm] = useState<Formulario | null>(null);
  const [admin, setAdmin] = useState<{ empresa: Empresa; nombre: string; usuario: string; correo: string; contrasena: string } | null>(null);
  const [token, setToken] = useState<{ empresa: string; token: string } | null>(null);

  const cargar = useCallback(() => {
    api<Empresa[]>("/inquilinos")
      .then(setEmpresas)
      .catch((e) => toast.error(mensaje(e)));
  }, []);

  useEffect(() => {
    if (sesion?.superAdministrador) cargar();
  }, [sesion?.superAdministrador, cargar]);

  if (!hayApi() || !sesion) {
    return <p className="text-sm text-muted-foreground">Esta pantalla requiere conexión con la API.</p>;
  }
  if (!sesion.disponible) {
    return <p className="text-sm text-muted-foreground">Falta ejecutar el script 23_saas_multi_inquilino.sql en la base de datos.</p>;
  }
  if (!sesion.superAdministrador) {
    return <p className="text-sm text-muted-foreground">Solo el Súper Administrador de Aplix gestiona las empresas.</p>;
  }

  const guardar = async () => {
    if (!form) return;
    const sinCupo = form.maxUsuarios.trim() === "";
    const cuerpo = {
      codigo: form.codigo,
      nombre: form.nombre,
      contacto: form.contacto || null,
      correo: form.correo || null,
      maxUsuarios: sinCupo ? null : Number(form.maxUsuarios),
      sinCupo,
      maxCompanias: form.maxCompanias.trim() === "" ? null : Number(form.maxCompanias),
      sinCupoCompanias: form.maxCompanias.trim() === "",
      fechaVencimiento: form.fechaVencimiento || null,
      activo: form.activo,
    };
    try {
      if (form.id) await api(`/inquilinos/${form.id}`, { metodo: "PUT", cuerpo });
      else await api("/inquilinos", { metodo: "POST", cuerpo });
      toast.success("Empresa guardada");
      setForm(null);
      cargar();
    } catch (e) {
      toast.error(mensaje(e));
    }
  };

  const generarToken = async (e: Empresa) => {
    if (e.tokenConfigurado && !window.confirm(`El token actual de ${e.nombre} dejará de funcionar. ¿Generar uno nuevo?`)) return;
    try {
      const r = await api<{ token: string }>(`/inquilinos/${e.id}/token-agente`, { metodo: "POST" });
      setToken({ empresa: e.nombre, token: r.token });
      cargar();
    } catch (err) {
      toast.error(mensaje(err));
    }
  };

  const crearAdmin = async () => {
    if (!admin) return;
    try {
      await api(`/inquilinos/${admin.empresa.id}/administrador`, {
        metodo: "POST",
        cuerpo: { nombre: admin.nombre, nombreUsuario: admin.usuario, correo: admin.correo || null, contrasena: admin.contrasena },
      });
      toast.success("Administrador creado");
      setAdmin(null);
      cargar();
    } catch (e) {
      toast.error(mensaje(e));
    }
  };

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Empresas"
        requerimiento="SaaS"
        descripcion="Empresas clientes del servicio: cupo de usuarios y compañías contratadas, vencimiento, estado y token del agente local."
        acciones={
          <Button size="sm" className="gap-1.5" onClick={() => setForm({ ...VACIO })}>
            <Plus className="size-4" /> Nueva empresa
          </Button>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Usuarios</TableHead>
              <TableHead>Compañías</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead>Agente</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((e) => {
              const lleno = nivelCupo(e.usuariosActivos, e.maxUsuarios) === "lleno";
              return (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.codigo}</TableCell>
                  <TableCell className="font-medium">
                    {e.nombre}
                    {e.esPrincipal ? <span className="ml-2 text-xs text-primary">(principal)</span> : null}
                  </TableCell>
                  <TableCell className={cn(lleno && "font-semibold text-advertencia")}>
                    {e.maxUsuarios == null ? `${e.usuariosActivos} · según licencia` : `${e.usuariosActivos} / ${e.maxUsuarios} activos`}
                  </TableCell>
                  <TableCell className={cn(nivelCupo(e.companiasRegistradas ?? 0, e.maxCompanias) === "lleno" && "font-semibold text-advertencia")}>
                    {e.maxCompanias == null ? `${e.companiasRegistradas ?? 0} · sin límite` : `${e.companiasRegistradas ?? 0} / ${e.maxCompanias}`}
                  </TableCell>
                  <TableCell>{e.fechaVencimiento ? e.fechaVencimiento.slice(0, 10) : "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span
                        className={cn(
                          "size-2 rounded-full",
                          e.agenteEnLinea ? "bg-exito" : e.tokenConfigurado ? "bg-destructive" : "bg-muted-foreground/40",
                        )}
                      />
                      {e.agenteEnLinea ? "En línea" : e.tokenConfigurado ? "Desconectado" : "Sin token"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={e.activo ? "secondary" : "outline"}>{e.activo ? "Activa" : "Suspendida"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() =>
                          setForm({
                            id: e.id,
                            codigo: e.codigo,
                            nombre: e.nombre,
                            contacto: e.contacto ?? "",
                            correo: e.correo ?? "",
                            maxUsuarios: e.maxUsuarios == null ? "" : String(e.maxUsuarios),
                            maxCompanias: e.maxCompanias == null ? "" : String(e.maxCompanias),
                            fechaVencimiento: e.fechaVencimiento?.slice(0, 10) ?? "",
                            activo: e.activo,
                            esPrincipal: e.esPrincipal,
                          })
                        }
                      >
                        <Pencil className="size-4" /> Editar
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => void generarToken(e)}>
                        <KeyRound className="size-4" /> Token
                      </Button>
                      {!e.esPrincipal ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setAdmin({ empresa: e, nombre: "", usuario: "", correo: "", contrasena: "" })}
                        >
                          <UserPlus className="size-4" /> Administrador
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Las empresas nuevas quedan registradas con su cupo y su agente; el ingreso de sus usuarios se habilita en el siguiente paso, cuando cada empresa vea solo sus propios datos.
      </p>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar empresa" : "Nueva empresa"}</DialogTitle>
          </DialogHeader>
          {form ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Código</Label>
                <Input value={form.codigo} disabled={!!form.id} placeholder="cliente-ejemplo" onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Contacto</Label>
                  <Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Correo</Label>
                  <Input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Usuarios contratados</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.maxUsuarios}
                    placeholder={form.esPrincipal ? "Según licencia" : ""}
                    onChange={(e) => setForm({ ...form, maxUsuarios: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Compañías contratadas</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.maxCompanias}
                    placeholder="Sin límite"
                    onChange={(e) => setForm({ ...form, maxCompanias: e.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Vencimiento</Label>
                  <Input type="date" value={form.fechaVencimiento} onChange={(e) => setForm({ ...form, fechaVencimiento: e.target.value })} />
                </div>
              </div>
              {!form.esPrincipal ? (
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.activo} onCheckedChange={(v) => setForm({ ...form, activo: v })} />
                  Empresa activa (si se suspende, sus usuarios y su agente dejan de ingresar)
                </label>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={() => void guardar()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!admin} onOpenChange={(o) => !o && setAdmin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Administrador de {admin?.empresa.nombre}</DialogTitle>
          </DialogHeader>
          {admin ? (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Nombre completo</Label>
                <Input value={admin.nombre} onChange={(e) => setAdmin({ ...admin, nombre: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Usuario</Label>
                <Input value={admin.usuario} onChange={(e) => setAdmin({ ...admin, usuario: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Correo</Label>
                <Input type="email" value={admin.correo} onChange={(e) => setAdmin({ ...admin, correo: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Contraseña inicial (mínimo 8)</Label>
                <Input type="password" value={admin.contrasena} onChange={(e) => setAdmin({ ...admin, contrasena: e.target.value })} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdmin(null)}>Cancelar</Button>
            <Button onClick={() => void crearAdmin()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!token} onOpenChange={(o) => !o && setToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token del agente · {token?.empresa}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cópielo ahora en el appsettings.json del agente de la empresa; no se volverá a mostrar.
          </p>
          <code className="block break-all rounded-md bg-muted p-3 font-mono text-xs">{token?.token}</code>
          <DialogFooter>
            <Button
              className="gap-1.5"
              onClick={() => {
                if (token) void navigator.clipboard.writeText(token.token);
                toast.success("Token copiado");
              }}
            >
              <Copy className="size-4" /> Copiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
