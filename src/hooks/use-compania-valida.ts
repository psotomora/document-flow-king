import { useEffect } from "react";
import type { Compania } from "@/data/tipos";

/**
 * Mantiene la compañía seleccionada dentro de la lista vigente. Al conectarse a
 * SQL Server las compañías reales reemplazan a las de demostración, por lo que
 * un identificador anterior (por ejemplo "tx") dejaría de ser válido.
 */
export function useCompaniaValida(
  companias: Compania[],
  valor: string,
  asignar: (id: string) => void,
) {
  useEffect(() => {
    const primera = companias[0];
    if (!primera) return;
    if (!companias.some((c) => c.id === valor)) asignar(primera.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companias, valor]);
}
