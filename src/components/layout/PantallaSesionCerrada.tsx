import { LogIn } from "lucide-react";
import { useApp } from "@/contexto/AppContexto";
import { Button } from "@/components/ui/button";
import { VersionApp } from "@/components/layout/VersionApp";

/** Página de finalización de sesión (modo conectado a SQL Server). */
export function PantallaSesionCerrada() {
  const { volverAlLogin } = useApp();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <section className="w-full max-w-sm text-center">
        <img
          src="/favicon.png"
          alt="Aplix"
          className="mx-auto size-10 opacity-70"
          loading="lazy"
        />
        <h1 className="mt-6 text-xl font-semibold tracking-tight text-foreground">
          Aplix Cash Flow Insights
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Su sesión se cerró correctamente y la conexión con el servidor fue finalizada.
        </p>

        <Button className="mt-8 w-full gap-2" onClick={volverAlLogin}>
          <LogIn className="size-4" aria-hidden />
          Iniciar sesión de nuevo
        </Button>

        <div className="mt-8 text-[11px] text-muted-foreground">
          <VersionApp />
        </div>
      </section>
    </main>
  );
}
