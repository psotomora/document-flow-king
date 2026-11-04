import { readFileSync } from "node:fs";

/** Sin fallback a la web: el nombre del ZIP identifica el componente publicado. */
export function versionProyecto(proyecto) {
  const xml = readFileSync(proyecto, "utf8").replace(/<!--[\s\S]*?-->/g, "");
  const versiones = [...xml.matchAll(/<Version\s*>([^<]*)<\/Version\s*>/g)];
  const version = versiones[0]?.[1].trim();
  if (versiones.length !== 1 || !version || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`El proyecto ${proyecto} debe declarar una única <Version> con formato mayor.menor.parche. No se creó un ZIP nuevo.`);
  }
  return version;
}