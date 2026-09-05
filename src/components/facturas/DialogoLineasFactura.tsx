import { useEffect, useState } from "react";
import { ListTree, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Factura, LineaFactura } from "@/data/tipos";
import { api } from "@/lib/api";
import { formatearMoneda, formatearNumero } from "@/lib/formato";

/** Detalle de FACTURA_LINEA para una factura leída desde SoftlandERP. */
export function DialogoLineasFactura({
  factura,
  abierto: abiertoExterno,
  onAbiertoChange,
  sinDisparador = false,
}: {
  factura: Factura;
  /** Modo controlado (p. ej. al abrir con doble clic sobre la fila). */
  abierto?: boolean;
  onAbiertoChange?: (v: boolean) => void;
  /** Oculta el botón disparador cuando se controla desde afuera. */
  sinDisparador?: boolean;
}) {
  const [abiertoInterno, setAbiertoInterno] = useState(false);
  const abierto = abiertoExterno ?? abiertoInterno;
  const setAbierto = (v: boolean) => {
    setAbiertoInterno(v);
    onAbiertoChange?.(v);
  };
  const [lineas, setLineas] = useState<LineaFactura[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto || lineas) return;
    api<LineaFactura[]>(`/facturas/${encodeURIComponent(factura.id)}/lineas`)
      .then(setLineas)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo leer el detalle"));
  }, [abierto, lineas, factura.id]);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      {sinDisparador ? null : (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Ver líneas de la factura ${factura.numero}`}
            title="Ver líneas de la factura"
          >
            <ListTree className="size-4 text-muted-foreground" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Factura {factura.numero} · {factura.cliente}
          </DialogTitle>
          <DialogDescription>
            Líneas leídas de SoftlandERP (FACTURA_LINEA). Total facturado:{" "}
            {formatearMoneda(factura.monto, factura.moneda)}
            {factura.notas ? ` · ${factura.notas}` : ""}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !lineas ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Consultando SoftlandERP…
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead className="text-right">Impuesto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineas.map((l) => (
                  <TableRow key={l.linea}>
                    <TableCell className="text-xs text-muted-foreground">{l.linea}</TableCell>
                    <TableCell className="font-medium">{l.articulo}</TableCell>
                    <TableCell className="max-w-64 truncate" title={l.descripcion ?? ""}>
                      {l.descripcion ?? ""}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.pedido ?? ""}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatearNumero(l.cantidad)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatearMoneda(l.precioUnitario, factura.moneda)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatearMoneda(l.descuento, factura.moneda)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatearMoneda(l.impuesto, factura.moneda)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium tabular-nums">
                      {formatearMoneda(l.total, factura.moneda)}
                    </TableCell>
                  </TableRow>
                ))}
                {lineas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                      La factura no tiene líneas.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
