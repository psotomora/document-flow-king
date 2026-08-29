import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
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

export const Route = createFileRoute("/catalogos")({
  head: () => ({
    meta: [
      { title: "Catálogos de compañías y bancos | Flujo de Efectivo Aplix" },
      {
        name: "description",
        content:
          "Administración de compañías y cuentas bancarias con sus saldos iniciales en dólares y colones.",
      },
      { property: "og:title", content: "Catálogos de compañías y bancos | Flujo de Efectivo Aplix" },
      {
        property: "og:description",
        content: "Mantenimiento de los catálogos base del sistema.",
      },
    ],
  }),
  component: PaginaCatalogos,
});

function PaginaCatalogos() {
  const { companias, bancos, esAdministrador, actualizarBanco } = useApp();
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Catálogos"
        requerimiento="RF-001"
        descripcion="Compañías y cuentas bancarias del sistema. Solo el perfil administrador puede modificarlos."
        acciones={esAdministrador ? <DialogoBanco abierto={abierto} setAbierto={setAbierto} /> : null}
      />

      {!esAdministrador ? (
        <p className="rounded-md border border-advertencia/40 bg-advertencia-suave px-4 py-3 text-sm text-advertencia-foreground">
          Su perfil no permite modificar catálogos; la información se muestra en modo consulta.
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Compañías
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Razón social</TableHead>
                <TableHead className="text-right">Cuentas bancarias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companias.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.codigo}</TableCell>
                  <TableCell>{c.nombre}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {bancos.filter((b) => b.companiaId === c.id).length}
                  </TableCell>
                </TableRow>
              ))}
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
    </div>
  );
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
