import { createFileRoute } from "@tanstack/react-router";
import { useCompaniaValida } from "@/hooks/use-compania-valida";
import { useState } from "react";
import { Copy, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/contexto/AppContexto";
import { formatearMoneda } from "@/lib/formato";
import type { Compania } from "@/data/tipos";
import { validarCompania } from "@/lib/companias";

export const Route = createFileRoute("/catalogos")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Catálogos de compañías y bancos | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Administración de compañías y cuentas bancarias con sus saldos iniciales en dólares y colones.",
      },
      { property: "og:title", content: "Catálogos de compañías y bancos | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Mantenimiento de los catálogos base del sistema.",
      },
    ],
  }),
  component: PaginaCatalogos,
});

function PaginaCatalogos() {
  const { companias, bancos, esAdministrador: esAdmin, usuario, actualizarBanco } = useApp();
  const esAdministrador =
    esAdmin || (usuario.perfil !== "consulta" && usuario.editarCatalogos === true);
  const [abierto, setAbierto] = useState(false);
  const [compania, setCompania] = useState<Compania | null>(null);

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Catálogos"
        requerimiento="RF-001"
        descripcion="Compañías y cuentas bancarias del sistema. Solo los administradores y los usuarios con el privilegio Modificar catálogos pueden modificarlos."
        acciones={esAdministrador ? <DialogoBanco abierto={abierto} setAbierto={setAbierto} /> : null}
      />

      {!esAdministrador ? (
        <p className="rounded-md border border-advertencia/40 bg-advertencia-suave px-4 py-3 text-sm text-advertencia-foreground">
          Su perfil no permite modificar catálogos; la información se muestra en modo consulta.
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Compañías</h2>
          {esAdministrador ? <Button size="sm" className="gap-1.5" onClick={() => setCompania({ id: "", codigo: "", nombre: "" })}><Plus className="size-4" /> Nueva compañía</Button> : null}
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Razón social</TableHead>
                <TableHead className="text-right">Cuentas bancarias</TableHead>
                {esAdministrador ? <TableHead className="text-right">Acciones</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {companias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell><div className="flex items-center gap-1"><span className="font-mono tabular-nums">{c.id}</span><Button variant="ghost" size="icon" aria-label={`Copiar ID de compañía ${c.codigo}`} title={`Copiar ID de compañía ${c.codigo}`} onClick={async () => { try { await navigator.clipboard.writeText(c.id); toast.success("ID de compañía copiado."); } catch { toast.error("No se pudo copiar el ID. Seleccione el número y cópielo manualmente."); } }}><Copy className="size-4" /></Button></div></TableCell>
                  <TableCell className="font-medium">{c.codigo}</TableCell>
                  <TableCell>{c.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {bancos.filter((b) => b.companiaId === c.id).length}
                  </TableCell>
                  {esAdministrador ? <TableCell className="text-right"><Button size="icon" variant="ghost" aria-label={`Editar compañía ${c.codigo}`} title={`Editar compañía ${c.codigo}`} onClick={() => setCompania(c)}><Pencil className="size-4" /></Button></TableCell> : null}
                </TableRow>
              ))}
              {companias.length === 0 ? <TableRow><TableCell colSpan={esAdministrador ? 5 : 4} className="py-8 text-center text-muted-foreground">No hay compañías registradas para su empresa.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Cuentas bancarias
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Compañía</TableHead>
                <TableHead className="text-right">Saldo inicial USD</TableHead>
                <TableHead className="text-right">Saldo inicial CRC</TableHead>
                <TableHead>Activo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bancos.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {companias.find((c) => c.id === b.companiaId)?.codigo}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatearMoneda(b.saldoInicialUSD, "USD")}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatearMoneda(b.saldoInicialCRC, "CRC")}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={b.activo}
                      disabled={!esAdministrador}
                      aria-label={`Activar cuenta ${b.nombre}`}
                      onCheckedChange={(v) => {
                        actualizarBanco(b.id, { activo: v });
                        toast.success(`${b.nombre}: ${v ? "activa" : "inactiva"}`);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      {compania ? <DialogoCompania key={compania.id} compania={compania} cerrar={() => setCompania(null)} /> : null}
    </div>
  );
}

function DialogoCompania({ compania, cerrar }: { compania: Compania; cerrar: () => void }) {
  const { agregarCompania, actualizarCompania } = useApp();
  const [codigo, setCodigo] = useState(compania.codigo);
  const [nombre, setNombre] = useState(compania.nombre);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const guardar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const invalido = validarCompania(codigo, nombre);
    setError(invalido);
    if (invalido || guardando) return;
    setGuardando(true);
    try {
      const datos = { codigo: codigo.trim(), nombre: nombre.trim() };
      const ok = compania.id ? await actualizarCompania(compania.id, datos) : await agregarCompania(datos);
      if (!ok) { setError("No se guardó la compañía. Revise el aviso y vuelva a intentar."); return; }
      toast.success(compania.id ? "Compañía actualizada" : "Compañía registrada en su empresa");
      cerrar();
    } finally { setGuardando(false); }
  };
  return <Dialog open onOpenChange={(v) => { if (!v && !guardando) cerrar(); }}><DialogContent className="max-w-md"><form onSubmit={guardar} className="space-y-4">
    <DialogHeader><DialogTitle>{compania.id ? "Editar compañía" : "Nueva compañía"}</DialogTitle><DialogDescription>Empresa propietaria: la de su usuario actual.</DialogDescription></DialogHeader>
    <div className="space-y-1.5"><Label htmlFor="c-codigo">Código</Label><Input id="c-codigo" value={codigo} maxLength={10} onChange={(e) => setCodigo(e.target.value)} required disabled={guardando} /></div>
    <div className="space-y-1.5"><Label htmlFor="c-nombre">Razón social</Label><Input id="c-nombre" value={nombre} maxLength={150} onChange={(e) => setNombre(e.target.value)} required disabled={guardando} /></div>
    {compania.id ? <p className="text-sm text-muted-foreground">ID para el agente: {compania.id}</p> : null}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <DialogFooter><Button type="button" variant="outline" disabled={guardando} onClick={cerrar}>Cancelar</Button><Button type="submit" disabled={guardando}>{guardando ? "Guardando…" : "Guardar compañía"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}

function DialogoBanco({
  abierto,
  setAbierto,
}: {
  abierto: boolean;
  setAbierto: (v: boolean) => void;
}) {
  const { companias, agregarBanco } = useApp();
  const [nombre, setNombre] = useState("");
  const [companiaId, setCompaniaId] = useState(companias[0]?.id ?? "");
  useCompaniaValida(companias, companiaId, setCompaniaId);
  const [usd, setUsd] = useState("0");
  const [crc, setCrc] = useState("0");

  const guardar = () => {
    if (!nombre) {
      toast.error("Indique el nombre de la cuenta bancaria.");
      return;
    }
    agregarBanco({
      nombre,
      companiaId,
      saldoInicialUSD: Number(usd) || 0,
      saldoInicialCRC: Number(crc) || 0,
      activo: true,
    });
    toast.success("Cuenta bancaria agregada");
    setAbierto(false);
    setNombre("");
    setUsd("0");
    setCrc("0");
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-4" /> Nueva cuenta bancaria
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva cuenta bancaria</DialogTitle>
          <DialogDescription>
            El saldo inicial se registra por separado en cada moneda.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-nombre">Nombre de la cuenta</Label>
            <Input id="b-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Compañía</Label>
            <Select value={companiaId} onValueChange={setCompaniaId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-usd">Saldo inicial USD</Label>
              <Input id="b-usd" type="number" value={usd} onChange={(e) => setUsd(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-crc">Saldo inicial CRC</Label>
              <Input id="b-crc" type="number" value={crc} onChange={(e) => setCrc(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={guardar}>Guardar cuenta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
