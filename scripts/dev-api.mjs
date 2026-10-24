// Arranca la API .NET local en http://localhost:5080 si el SDK de .NET está instalado.
import { spawn, spawnSync } from "node:child_process";
const hay = spawnSync("dotnet", ["--version"], { shell: true }).status === 0;
if (!hay) {
  console.log("[api] .NET SDK no encontrado; se omite la API local.");
  process.exit(0);
}
const p = spawn("dotnet", ["run", "--project", "api/FlujoEfectivo.Api", "--urls", "http://localhost:5080"], {
  stdio: "inherit", shell: true, env: { ...process.env, ASPNETCORE_ENVIRONMENT: "Development" },
});
p.on("exit", (c) => process.exit(c ?? 0));
