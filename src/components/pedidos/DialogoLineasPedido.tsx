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
import type { LineaPedido, Pedido } from "@/data/tipos";
import { api } from "@/lib/api";
import { formatearFecha, formatearMoneda, formatearNumero } from "@/lib/formato";

/** Detalle de PEDIDO_LINEA para un pedido leído desde SoftlandERP. */
export function DialogoLineasPedido({ pedido }: { pedido: Pedido }) {
  const [abierto, setAbierto] = useState(false);
  const [lineas, setLineas] = useState<LineaPedido[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto || lineas) return;
    api<LineaPedido[]>(`/pedidos/${encodeURIComponent(pedido.id)}/lineas`)
      .then(setLineas)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No se pudo leer el detalle"));
  }, [abierto, lineas, pedido.id]);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Ver líneas del pedido ${pedido.numero}`}
          title="Ver líneas del pedido"
        >
          <ListTree className="size-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Pedido {pedido.numero} · {pedido.cliente}
          </DialogTitle>
          <DialogDescription>
            Líneas leídas de SoftlandERP (PEDIDO_LINEA). Total a facturar:{" "}
            {formatearMoneda(pedido.monto, pedido.moneda)}
            {pedido.notas ? ` · ${pedido.notas}` : ""}
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
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Descuento</TableHead>
                  <TableHead>Entrega</TableHead>
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
                    <TableCell className="text-right tabular-nums">
                      {formatearNumero(l.cantidad)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatearMoneda(l.precioUnitario, pedido.moneda)}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                      {formatearMoneda(l.descuento, pedido.moneda)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatearFecha(l.fechaEntrega)}
                    </TableCell>
                  </TableRow>
                ))}
                {lineas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                      El pedido no tiene líneas.
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
