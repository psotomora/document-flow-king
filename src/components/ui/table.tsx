import * as React from "react";

import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
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
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
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
