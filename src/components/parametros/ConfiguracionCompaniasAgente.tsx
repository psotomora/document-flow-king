import { useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Compania } from "@/data/tipos";
import { configuracionCompaniasAgente } from "@/lib/configuracion-companias-agente";

export function ConfiguracionCompaniasAgente({ companias }: { companias: Compania[] }) {
  const [esquemas, setEsquemas] = useState<Record<string, string>>({});
  const json = configuracionCompaniasAgente(companias, esquemas);
  async function copiar() {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      toast.success("Configuración de compañías copiada.");
    } catch { toast.error("No se pudo copiar. Seleccione el JSON y cópielo manualmente."); }
  }
  if (companias.length === 0) return null;
  return <div className="min-w-0 space-y-3 border-t border-border pt-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold">Compañías · appsettings.json</h3>
      <Button variant="outline" size="sm" className="gap-1.5" disabled={!json} onClick={() => void copiar()}><Copy className="size-4" /> Copiar JSON</Button>
    </div>
    <p className="text-xs text-muted-foreground">Confirme el esquema real de Softland; el código de la compañía es una propuesta. Reemplace únicamente la propiedad Companias dentro de Agente, conservando ApiUrl, Token y Softland.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {companias.map((c) => <div key={c.id} className="min-w-0 space-y-1">
        <Label htmlFor={`esquema-agente-${c.id}`} className="break-words">{c.codigo} · ID {c.id} · Esquema Softland</Label>
        <Input id={`esquema-agente-${c.id}`} value={esquemas[c.id] ?? c.codigo} onChange={(e) => setEsquemas((prev) => ({ ...prev, [c.id]: e.target.value }))} />
      </div>)}
    </div>
    {json ? <textarea aria-label="JSON de compañías del agente" readOnly value={json} onFocus={(e) => e.currentTarget.select()} rows={Math.min(18, json.split("\n").length)} className="block w-full min-w-0 resize-y rounded-md border border-input bg-muted p-3 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" /> : <p className="text-xs text-destructive">Se requieren IDs numéricos válidos y un esquema para cada compañía.</p>}
  </div>;
}