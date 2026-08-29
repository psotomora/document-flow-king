import type { ReactNode } from "react";

export function EncabezadoPagina({
  titulo,
  requerimiento,
  descripcion,
  acciones,
}: {
  titulo: string;
  requerimiento?: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{titulo}</h1>
          {requerimiento ? (
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {requerimiento}
            </span>
          ) : null}
        </div>
        {descripcion ? (
          <p className="max-w-3xl text-sm text-muted-foreground">{descripcion}</p>
        ) : null}
      </div>
      {acciones ? <div className="flex flex-wrap items-center gap-2">{acciones}</div> : null}
    </div>
  );
}
