"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Grip, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { redimensionable?: boolean }
>(({ className, children, redimensionable = false, style, ...props }, ref) => {
  const contenidoRef = React.useRef<HTMLDivElement | null>(null);
  const [tamano, setTamano] = React.useState<{ width: number; height: number } | null>(null);

  const asignarRef = React.useCallback((node: HTMLDivElement | null) => {
    contenidoRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  const ajustar = (width: number, height: number) => {
    setTamano({
      width: Math.max(Math.min(384, window.innerWidth - 32), Math.min(width, window.innerWidth - 32)),
      height: Math.max(Math.min(240, window.innerHeight - 32), Math.min(height, window.innerHeight - 32)),
    });
  };

  const iniciarAjuste = (event: React.PointerEvent<HTMLButtonElement>) => {
    const contenido = contenidoRef.current;
    if (!contenido) return;
    event.preventDefault();
    const rect = contenido.getBoundingClientRect();
    const inicioX = event.clientX;
    const inicioY = event.clientY;
    const control = event.currentTarget;
    control.setPointerCapture(event.pointerId);
    const mover = (movimiento: PointerEvent) => {
      // El diálogo permanece centrado: cada borde se desplaza la mitad del cambio.
      ajustar(rect.width + 2 * (movimiento.clientX - inicioX), rect.height + 2 * (movimiento.clientY - inicioY));
    };
    const terminar = () => {
      control.removeEventListener("pointermove", mover);
      control.removeEventListener("lostpointercapture", terminar);
    };
    control.addEventListener("pointermove", mover);
    control.addEventListener("lostpointercapture", terminar, { once: true });
  };

  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={asignarRef}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg grid-cols-[minmax(0,1fr)] [&>*]:min-w-0 translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
        className,
        redimensionable && "flex w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col overflow-hidden [&>div]:min-h-0 [&>div]:shrink-0 [&>div:has(table)]:shrink",
      )}
      style={{ ...style, ...(redimensionable && tamano ? { ...tamano, maxWidth: "calc(100vw - 2rem)" } : {}) }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
      {redimensionable ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Cambiar tamaño de la ventana"
          title="Cambiar tamaño de la ventana"
          className="absolute bottom-0 right-0 size-6 cursor-nwse-resize touch-none text-muted-foreground"
          onPointerDown={iniciarAjuste}
          onKeyDown={(event) => {
            const rect = contenidoRef.current?.getBoundingClientRect();
            if (!rect || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
            event.preventDefault();
            ajustar(rect.width + (event.key === "ArrowRight" ? 32 : event.key === "ArrowLeft" ? -32 : 0), rect.height + (event.key === "ArrowDown" ? 32 : event.key === "ArrowUp" ? -32 : 0));
          }}
        >
          <Grip className="size-4" />
        </Button>
      ) : null}
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
