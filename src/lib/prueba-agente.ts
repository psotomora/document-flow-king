/** Estado de la comprobación de Conexión 1/2 delegada al agente local. */
export type EstadoPruebaAgente = "sin_probar" | "en_proceso" | "fallida" | "exitosa";

export interface PruebaAgente {
  estado: EstadoPruebaAgente;
  solicitadaEn?: string | null;
  resueltaEn?: string | null;
  mensaje?: string | null;
}

export type TonoPrueba = "proceso" | "error" | "exito";

/** Texto y color visibles; null cuando nunca se ha solicitado una comprobación. */
export function presentarPruebaAgente(
  p: PruebaAgente | null,
): { etiqueta: string; tono: TonoPrueba } | null {
  switch (p?.estado) {
    case "en_proceso":
      return { etiqueta: "Comprobación en proceso", tono: "proceso" };
    case "fallida":
      return { etiqueta: "Falló comprobación", tono: "error" };
    case "exitosa":
      return { etiqueta: "Comprobación exitosa", tono: "exito" };
    default:
      return null;
  }
}

export const TEXTO_AYUDA_PRUEBA_AGENTE =
  "Guarda las credenciales y solicita al agente local que las valide desde la red de su empresa. " +
  "El resultado aparece debajo cuando el agente responde (normalmente en uno o dos minutos).";
