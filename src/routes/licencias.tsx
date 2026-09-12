import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EncabezadoPagina } from "@/components/comunes/EncabezadoPagina";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useApp } from "@/contexto/AppContexto";
import {
  descargarTexto,
  emitirLicencia,
  estadoLicencia,
  generarLlaves,
  licenciaDisponible,
  licenciasEmitidas,
  type DatosEmision,
  type LicenciaEmitida,
} from "@/lib/licencia";

export const Route = createFileRoute("/licencias")({
  head: () => ({
    meta: [
      { title: "Emisión de licencias | Aplix Cash Flow Insights" },
      {
        name: "description",
        content:
          "Generación de archivos de licencia firmados para las aplicaciones de Aplix: cliente, vigencia, compañías y usuarios permitidos.",
      },
      { property: "og:title", content: "Emisión de licencias | Aplix Cash Flow Insights" },
      {
        property: "og:description",
        content: "Genere y consulte las licencias firmadas entregadas a cada cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PaginaLicencias,
});

const VACIO: DatosEmision = {
  clienteCodigo: "",
  clienteNombre: "",
  producto: "FlujoEfectivo",
  vence: "",
  huella: "",
  companias: "",
  maxUsuarios: 0,
  diasGracia: 15,
  notas: "",
};

function PaginaLicencias() {
  const { esAdministrador, instalacionCliente } = useApp();
  const [datos, setDatos] = useState<DatosEmision>(VACIO);
  const [historial, setHistorial] = useState<LicenciaEmitida[]>([]);
  const [emisor, setEmisor] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [llaves, setLlaves] = useState<{ privada: string; publica: string } | null>(null);

  useEffect(() => {
    if (!licenciaDisponible()) return;
    void (async () => {
      try {
        const estado = await estadoLicencia();
        setEmisor(estado.emisor);
        if (estado.emisor) setHistorial(await licenciasEmitidas());
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "No fue posible consultar el emisor.");
      }
    })();
  }, []);

  if (instalacionCliente) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm font-medium">Opción no disponible</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta instalación está marcada como equipo del cliente. La emisión de licencias solo se
          realiza desde el servidor propio.
        </p>
      </div>
    );
  }

  if (!esAdministrador) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-sm font-medium">Opción no disponible</p>
        <p className="mt-1 text-sm text-muted-foreground">
          La emisión de licencias es exclusiva de los administradores.
        </p>
      </div>
    );
  }

  const emitir = async () => {
    if (!datos.clienteNombre.trim() || !datos.vence) {
      toast.error("Indique el cliente y la fecha de vencimiento.");
      return;
    }
    setOcupado(true);
    try {
      const res = await emitirLicencia(datos);
      descargarTexto(res.nombreArchivo, res.archivo);
      toast.success(`Licencia ${res.serie} generada y descargada.`);
      setHistorial(await licenciasEmitidas());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible emitir la licencia.");
    } finally {
      setOcupado(false);
    }
  };

  const crearLlaves = async () => {
    setOcupado(true);
    try {
      setLlaves(await generarLlaves());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible generar las llaves.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-6">
      <EncabezadoPagina
        titulo="Emisión de licencias"
        descripcion="Genere archivos .lic firmados para las instalaciones de los clientes."
      />

      {!emisor ? (
        <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Este servidor no está configurado como emisor. Agregue <code>Licencia:LlavePrivada</code>{" "}
          y <code>Licencia:Emisor = true</code> en la configuración de la API interna de Aplix.
        </div>
      ) : null}

      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lic-cliente">Cliente</Label>
          <Input
            id="lic-cliente"
            value={datos.clienteNombre}
            onChange={(e) => setDatos({ ...datos, clienteNombre: e.target.value })}
            placeholder="Theronix, S. A."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lic-codigo">Código de cliente</Label>
          <Input
            id="lic-codigo"
            value={datos.clienteCodigo}
            onChange={(e) => setDatos({ ...datos, clienteCodigo: e.target.value })}
            placeholder="THERONIX"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lic-producto">Producto</Label>
          <Input
            id="lic-producto"
            value={datos.producto}
            onChange={(e) => setDatos({ ...datos, producto: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lic-vence">Vence</Label>
          <Input
            id="lic-vence"
            type="date"
            value={datos.vence}
            onChange={(e) => setDatos({ ...datos, vence: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lic-huella">Huella del servidor del cliente</Label>
          <Input
            id="lic-huella"
            value={datos.huella}
            onChange={(e) => setDatos({ ...datos, huella: e.target.value })}
            placeholder="Se copia desde Parámetros del cliente"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lic-companias">Compañías permitidas</Label>
          <Input
            id="lic-companias"
            value={datos.companias}
            onChange={(e) => setDatos({ ...datos, companias: e.target.value })}
            placeholder="Separadas por coma; vacío = todas"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lic-usuarios">Usuarios activos permitidos</Label>
          <Input
            id="lic-usuarios"
            type="number"
            min={0}
            value={datos.maxUsuarios}
            onChange={(e) => setDatos({ ...datos, maxUsuarios: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lic-gracia">Días de gracia tras el vencimiento</Label>
          <Input
            id="lic-gracia"
            type="number"
            min={0}
            value={datos.diasGracia}
            onChange={(e) => setDatos({ ...datos, diasGracia: Number(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="lic-notas">Notas</Label>
          <Input
            id="lic-notas"
            value={datos.notas}
            onChange={(e) => setDatos({ ...datos, notas: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button disabled={ocupado || !emisor} onClick={() => void emitir()}>
            Emitir y descargar licencia
          </Button>
          <Button variant="outline" disabled={ocupado} onClick={() => setDatos(VACIO)}>
            Limpiar
          </Button>
          <Button variant="ghost" disabled={ocupado} onClick={() => void crearLlaves()}>
            Generar par de llaves
          </Button>
        </div>
      </div>

      {llaves ? (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Guarde la llave privada solo en el servidor emisor (Licencia:LlavePrivada) y copie la
            llave pública en la configuración de cada aplicación cliente (Licencia:LlavePublica).
            Estas llaves no se almacenan en la base de datos.
          </p>
          <Textarea readOnly rows={6} value={llaves.privada} className="font-mono text-xs" />
          <Textarea readOnly rows={4} value={llaves.publica} className="font-mono text-xs" />
        </div>
      ) : null}

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serie</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Huella</TableHead>
              <TableHead>Vence</TableHead>
              <TableHead className="text-right">Usuarios</TableHead>
              <TableHead>Emitida</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {historial.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                  Todavía no se han emitido licencias desde este servidor.
                </TableCell>
              </TableRow>
            ) : (
              historial.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.serie}</TableCell>
                  <TableCell>{l.clienteNombre}</TableCell>
                  <TableCell>{l.producto}</TableCell>
                  <TableCell className="font-mono text-xs">{l.huella || "—"}</TableCell>
                  <TableCell>{l.vence}</TableCell>
                  <TableCell className="text-right">{l.maxUsuarios || "Sin límite"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.emitidaEn?.replace("T", " ")} · {l.emitidaPor}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        descargarTexto(
                          `${l.clienteCodigo || l.clienteNombre}-${l.serie}.lic`.replace(/ /g, "-"),
                          l.archivo,
                        )
                      }
                    >
                      Descargar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
