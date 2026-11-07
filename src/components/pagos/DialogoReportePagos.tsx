import { useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { MensajeCorreo, separarMensajeCorreo } from "@/components/comunes/MensajeCorreo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApp } from "@/contexto/AppContexto";
import { api, ErrorApi } from "@/lib/api";
import { construirReporteHtml, leerTablaVisible, separarDestinatarios } from "@/lib/reporte-correo";

/** Envía por correo (HTML en el cuerpo) la tabla de pagos recibidos tal como se ve con los filtros activos. */
export function DialogoReportePagos({
  tablaId,
  filtros,
  totales,
}: {
  tablaId: string;
  filtros: string[];
  totales: string[];
}) {
  const { modoApi } = useApp();
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    const { validos, invalidos } = separarDestinatarios(correo);
    if (invalidos.length || !validos.length) {
      toast.error(invalidos.length ? `Revise el correo: ${invalidos[0]}` : "Indique al menos un destinatario.");
      return;
    }
    if (!modoApi) {
      toast.error("El envío de correo requiere la conexión con el servidor.");
      return;
    }
    const tabla = document.getElementById(tablaId)?.querySelector("table");
    if (!tabla) {
      toast.error("No se encontró la tabla de pagos.");
      return;
    }
    const datos = leerTablaVisible(tabla as HTMLTableElement);
    const html = construirReporteHtml({ titulo: "Informe de pagos recibidos", filtros, totales, ...datos });
    setEnviando(true);
    setError(null);
    try {
      const r = await api<{ mensaje: string }>("/correo/reporte", {
        metodo: "POST",
        cuerpo: {
          destinatario: validos.join(";"),
          asunto: "Informe de pagos recibidos",
          html,
          comentarios: comentarios.trim() || null,
          registros: datos.filas.length,
        },
      });
      toast.success(r.mensaje);
      setAbierto(false);
      setComentarios("");
    } catch (e) {
      const t = e instanceof ErrorApi || e instanceof Error ? e.message : "No fue posible enviar el correo.";
      setError(t);
      toast.error(separarMensajeCorreo(t).resumen);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAbierto(true)}>
        <Mail className="size-4" /> Enviar informe
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar informe de pagos recibidos</DialogTitle>
          <DialogDescription>
            Se envía en el cuerpo del correo la tabla con los filtros y columnas visibles en pantalla.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {filtros.length ? (
            <p className="text-xs text-muted-foreground">{filtros.join(" · ")}</p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="rp-correo">Destinatarios (separados por coma)</Label>
            <Input
              id="rp-correo"
              placeholder="ana@empresa.com, luis@empresa.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-comentarios">Comentarios (aparecen después del informe)</Label>
            <Textarea
              id="rp-comentarios"
              rows={4}
              maxLength={2000}
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
            />
          </div>
          {error ? <MensajeCorreo ok={false} mensaje={error} /> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAbierto(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={enviando} className="gap-1.5">
            {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
