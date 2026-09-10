import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexto/AppContexto";

/**
 * Vuelve a leer los datos del servidor (incluido el origen externo) sin recargar
 * la página ni afectar la sesión. En modo demostración no se muestra.
 */
export function BotonActualizar() {
  const { modoApi, cargando, recargar } = useApp();
  if (!modoApi) return null;

  const actualizar = async () => {
    await recargar();
    toast.success("Datos actualizados.");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5"
      disabled={cargando}
      onClick={() => void actualizar()}
    >
      <RefreshCw className={`size-4 ${cargando ? "animate-spin" : ""}`} />
      {cargando ? "Actualizando…" : "Actualizar"}
    </Button>
  );
}
