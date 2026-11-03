import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useSesionSaas } from "@/lib/empresas";

/**
 * Casilla «Súper Administrador de Aplix»: solo visible para un Súper
 * Administrador; la API valida el permiso y que el usuario sea administrador.
 */
export function SuperAdministradorUsuario({ usuarioId, esPropio }: { usuarioId: string; esPropio: boolean }) {
  const sesion = useSesionSaas();
  const [valor, setValor] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!sesion?.superAdministrador) return;
    api<{ valor: boolean }>(`/inquilinos/usuarios/${usuarioId}/super-administrador`)
      .then((r) => setValor(r.valor))
      .catch(() => setValor(null));
  }, [sesion?.superAdministrador, usuarioId]);

  if (!sesion?.superAdministrador || valor === null) return null;

  const cambiar = async (nuevo: boolean) => {
    setGuardando(true);
    try {
      await api(`/inquilinos/usuarios/${usuarioId}/super-administrador`, { metodo: "PUT", cuerpo: { valor: nuevo } });
      setValor(nuevo);
      toast.success(nuevo ? "Súper Administrador asignado." : "Súper Administrador retirado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar el permiso.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">Súper Administrador de Aplix</p>
        <p className="text-xs text-muted-foreground">
          Permite administrar Empresas. Requiere perfil Administrador; se aplica de inmediato.
          {esPropio ? " No puede retirarse a sí mismo." : ""}
        </p>
      </div>
      <Switch checked={valor} disabled={guardando || (esPropio && valor)} onCheckedChange={cambiar} />
    </div>
  );
}
