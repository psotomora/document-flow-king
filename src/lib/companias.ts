export function validarCompania(codigo: string, nombre: string): string | null {
  if (!codigo.trim() || !nombre.trim()) return "Indique el código y la razón social de la compañía.";
  if (codigo.trim().length > 10) return "El código admite un máximo de 10 caracteres.";
  if (nombre.trim().length > 150) return "La razón social admite un máximo de 150 caracteres.";
  return null;
}