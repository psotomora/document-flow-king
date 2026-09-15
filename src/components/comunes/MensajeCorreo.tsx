import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const MARCA_DETALLE = "Detalle técnico:";

/** Separa el mensaje del servidor en la parte amable y el detalle para el administrador. */
export function separarMensajeCorreo(texto: string) {
  const i = texto.indexOf(MARCA_DETALLE);
  if (i < 0) return { resumen: texto.trim(), detalle: "" };
  return {
    resumen: texto.slice(0, i).trim(),
    detalle: texto.slice(i + MARCA_DETALLE.length).trim(),
  };
}

/**
 * Muestra el resultado de un envío de correo: primero una explicación entendible y,
 * plegado, el detalle técnico que el administrador necesita para corregir la causa.
 */
export function MensajeCorreo({ ok, mensaje }: { ok: boolean; mensaje: string }) {
  const [abierto, setAbierto] = useState(false);
  const { resumen, detalle } = separarMensajeCorreo(mensaje);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(mensaje);
      toast.success("Detalle copiado.");
    } catch {
      toast.error("No se pudo copiar el detalle.");
    }
  };

  return (
    <div
      className={`rounded-md border p-3 text-xs ${
        ok
          ? "border-exito/40 bg-exito/10 text-exito"
          : "border-destructive/40 bg-destructive/10 text-foreground"
      }`}
    >
      <div className="flex items-start gap-2">
        {ok ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        ) : (
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        )}
        <p className="whitespace-pre-line font-medium">{resumen}</p>
      </div>

      {detalle ? (
        <div className="mt-2 border-t border-border/60 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setAbierto((v) => !v)}
            >
              <ChevronDown className={`size-3.5 transition-transform ${abierto ? "rotate-180" : ""}`} />
              {abierto ? "Ocultar detalle técnico" : "Ver detalle técnico (para el administrador)"}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={copiar}>
              <Copy className="size-3.5" /> Copiar
            </Button>
          </div>
          {abierto ? (
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded bg-muted/60 p-2 font-mono text-[11px] text-muted-foreground">
              {detalle}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
