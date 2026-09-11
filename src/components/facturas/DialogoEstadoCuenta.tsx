import { useMemo, useState } from "react";
import { Download, Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useApp } from "@/contexto/AppContexto";
import type { FacturaCalculada } from "@/lib/calculos";
import { api, ErrorApi } from "@/lib/api";
import { generarEstadoCuenta } from "@/lib/estado-cuenta";
import { formatearMoneda } from "@/lib/formato";

/** RF: envío del estado de cuenta de un cliente en PDF por correo electrónico. */
export function DialogoEstadoCuenta({ facturas }: { facturas: FacturaCalculada[] }) {
  const { companias, companiaActiva, usuario, modoApi } = useApp();
  const [abierto, setAbierto] = useState(false);
  const [cliente, setCliente] = useState("");
  const [dirigido, setDirigido] = useState("");
  const [correo, setCorreo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [descargando, setDescargando] = useState(false);

  /** Clientes con saldo pendiente, con el total por moneda como referencia. */
  const clientes = useMemo(() => {
    const mapa = new Map<string, FacturaCalculada[]>();
    for (const f of facturas) {
      if (f.saldoPendiente <= 0.009) continue;
      const lista = mapa.get(f.cliente) ?? [];
      lista.push(f);
      mapa.set(f.cliente, lista);
    }
    return [...mapa.entries()]
      .map(([nombre, lista]) => ({ nombre, lista }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [facturas]);

  const seleccionadas = clientes.find((c) => c.nombre === cliente)?.lista ?? [];

  const nombreCompania =
    companiaActiva === "todas"
      ? (companias.map((c) => c.codigo).join(" · ") || "Aplix")
      : (companias.find((c) => c.id === companiaActiva)?.nombre ??
        companias.find((c) => c.id === companiaActiva)?.codigo ??
        "Aplix");

  const generar = async () => {
    return generarEstadoCuenta(cliente, seleccionadas, nombreCompania, usuario.nombre);
  };

  const descargar = async () => {
    if (!cliente) {
      toast.error("Seleccione el cliente.");
      return;
    }
    setDescargando(true);
    try {
      const pdf = await generar();
      const url = URL.createObjectURL(pdf.blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = pdf.nombreArchivo;
      enlace.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No fue posible generar el PDF.");
    } finally {
      setDescargando(false);
    }
  };

  const enviar = async () => {
    if (!cliente) {
      toast.error("Seleccione el cliente.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      toast.error("Indique un correo de destinatario válido.");
      return;
    }
    if (!modoApi) {
      toast.error("El envío de correo requiere la conexión con el servidor. Descargue el PDF.");
      return;
    }
    setEnviando(true);
    try {
      const pdf = await generar();
      const r = await api<{ mensaje: string }>("/correo/estado-cuenta", {
        metodo: "POST",
        cuerpo: {
          destinatario: correo.trim(),
          cliente,
          dirigido: dirigido.trim() || null,
          compania: nombreCompania,
          documentos: seleccionadas.length,
          nombreArchivo: pdf.nombreArchivo,
          archivoBase64: pdf.base64,
        },
      });
      toast.success(r.mensaje);
      setAbierto(false);
      setCorreo("");
      setDirigido("");
    } catch (e) {
      toast.error(
        e instanceof ErrorApi || e instanceof Error ? e.message : "No fue posible enviar el correo.",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Mail className="size-4" /> Envío de estados de cuenta
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Envío de estados de cuenta</DialogTitle>
          <DialogDescription>
            Genera un PDF con el logo de Aplix, el nombre del cliente, la fecha de emisión y el
            desglose de sus facturas pendientes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Select value={cliente} onValueChange={setCliente}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione el cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.nombre} value={c.nombre}>
                    {c.nombre} · {c.lista.length} doc.
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clientes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No hay clientes con saldo pendiente para los datos cargados.
              </p>
            ) : null}
          </div>

          {seleccionadas.length > 0 ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
              <p className="font-medium text-foreground">{seleccionadas.length} factura(s) incluidas</p>
              <p className="mt-1 text-muted-foreground">
                {(["USD", "CRC"] as const)
                  .map((m) => {
                    const saldo = seleccionadas
                      .filter((f) => f.moneda === m)
                      .reduce((s, f) => s + Math.max(f.saldoPendiente, 0), 0);
                    return saldo > 0 ? `Saldo ${m}: ${formatearMoneda(saldo, m)}` : "";
                  })
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="ec-correo">Correo del destinatario</Label>
            <Input
              id="ec-correo"
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="cliente@empresa.com"
            />
            <p className="text-xs text-muted-foreground">
              Se envía desde el servidor de correo configurado en Parámetros.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={descargar} disabled={descargando || !cliente}>
            {descargando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            Descargar PDF
          </Button>
          <Button onClick={enviar} disabled={enviando || !cliente}>
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar por correo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
