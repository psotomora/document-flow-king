import * as React from "react";

import { useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useAppOpcional } from "@/contexto/AppContexto";
import { SelectorColumnas } from "@/components/comunes/SelectorColumnas";
import { leerConfigColumnas, permutacionColumnas, claveColumnas, textoNodo, type ConfigColumnas } from "@/lib/columnas";

type CtxTabla = {
  etiquetas: string[];
  setEtiquetas: (e: string[]) => void;
  orden: number[] | null;
};
const ContextoTabla = React.createContext<CtxTabla | null>(null);
const ContextoEncabezado = React.createContext(false);

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => {
    const app = useAppOpcional();
    const ruta = useRouterState({ select: (r) => r.location.pathname });
    const [etiquetas, setEtiquetasEstado] = React.useState<string[]>([]);
    const setEtiquetas = React.useCallback((e: string[]) => {
      setEtiquetasEstado((a) => (a.join("\u0001") === e.join("\u0001") ? a : e));
    }, []);
    const clave = etiquetas.length ? claveColumnas(ruta, etiquetas) : "";
    const config = leerConfigColumnas(clave ? app?.preferencias[clave] : undefined);
    const orden = etiquetas.length && app ? permutacionColumnas(etiquetas, config) : null;
    const guardar = (c: ConfigColumnas | null) => {
      if (app && clave) app.actualizarPreferencia(clave, c ? JSON.stringify(c) : "");
    };
    return (
      <ContextoTabla.Provider value={{ etiquetas, setEtiquetas, orden }}>
        {app && etiquetas.length > 1 ? (
          <div className="flex justify-end px-1 py-1">
            <SelectorColumnas etiquetas={etiquetas} config={config} onCambio={guardar} />
          </div>
        ) : null}
        <div className="relative w-full overflow-auto">
          <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
        </div>
      </ContextoTabla.Provider>
    );
  },
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <ContextoEncabezado.Provider value={true}>
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
  </ContextoEncabezado.Provider>
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, children, ...props }, ref) => {
    const tabla = React.useContext(ContextoTabla);
    const enEncabezado = React.useContext(ContextoEncabezado);
    // Children.map conserva las posiciones de celdas condicionales (null).
    const celdas: React.ReactNode[] = [];
    React.Children.map(children, (c) => {
      celdas.push(c);
      return null;
    });
    const firma = enEncabezado ? celdas.map((c, i) => textoNodo(c).trim() || `Columna ${i + 1}`) : null;
    const firmaTexto = firma?.join("\u0001");
    const setEtiquetas = tabla?.setEtiquetas;
    React.useEffect(() => {
      if (firma && setEtiquetas && celdas.length > 1) setEtiquetas(firma);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [firmaTexto, setEtiquetas]);
    const orden = tabla?.orden;
    const contenido =
      orden && tabla && celdas.length === tabla.etiquetas.length
        ? orden.map((i) => <React.Fragment key={i}>{celdas[i]}</React.Fragment>)
        : children;
    return (
      <tr
        ref={ref}
        className={cn(
          "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
          className,
        )}
        {...props}
      >
        {contenido}
      </tr>
    );
  },
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, children, style, colSpan, ...props }, forwardedRef) => {
  const localRef = React.useRef<HTMLTableCellElement | null>(null);

  const asignarRef = React.useCallback(
    (node: HTMLTableCellElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const iniciarAjuste = (event: React.PointerEvent<HTMLSpanElement>) => {
    const celda = localRef.current;
    if (!celda) return;
    event.preventDefault();
    event.stopPropagation();
    const inicioX = event.clientX;
    const anchoInicial = celda.getBoundingClientRect().width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const mover = (movimiento: PointerEvent) => {
      const ancho = Math.max(72, anchoInicial + movimiento.clientX - inicioX);
      celda.style.width = `${ancho}px`;
      celda.style.minWidth = `${ancho}px`;
      celda.style.maxWidth = `${ancho}px`;
    };
    const terminar = () => {
      document.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerup", terminar);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("pointermove", mover);
    document.addEventListener("pointerup", terminar, { once: true });
  };

  return (
    <th
      ref={asignarRef}
      colSpan={colSpan}
      style={style}
      className={cn(
        "group/column relative h-10 min-w-18 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        className,
      )}
      {...props}
    >
      {children}
      {!colSpan || colSpan === 1 ? (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label="Ajustar ancho de columna"
          title="Arrastre para ajustar la columna"
          onPointerDown={iniciarAjuste}
          className="absolute inset-y-0 right-0 z-30 w-2 cursor-col-resize touch-none border-r border-transparent transition-colors hover:border-primary group-hover/column:border-border"
        />
      ) : null}
    </th>
  );
});
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
