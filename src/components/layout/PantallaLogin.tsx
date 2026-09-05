import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Loader2, LockKeyhole, ServerCog, Tag } from "lucide-react";
import { useApp } from "@/contexto/AppContexto";
import { configurarUrlApi, probarConexionApi, urlApi } from "@/lib/api";
import { APP_FECHA_VERSION, APP_VERSION } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { CampoContrasena } from "@/components/comunes/CampoContrasena";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const LOGO_APLIX_URL =
  "https://document-flow-king.lovable.app/__l5e/assets-v1/e71ea6c3-b2e8-40c3-a8f5-c4f66d7f945a/aplix-isotipo.png";

/** Pantalla de autenticación contra la API .NET (tabla flujo.Usuario + JWT). */
export function PantallaLogin() {
  const { autenticar } = useApp();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [servidor, setServidor] = useState(urlApi());
  const [editandoServidor, setEditandoServidor] = useState(false);
  const [probandoServidor, setProbandoServidor] = useState(false);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await autenticar(usuario.trim(), contrasena);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión");
    } finally {
      setEnviando(false);
    }
  }

  function alPresionarEnter(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void enviar();
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <img
        src={LOGO_APLIX_URL}
        alt="Aplix"
        className="mb-4 h-16 w-auto object-contain"
      />
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="size-5" aria-hidden />
          </div>
          <CardTitle>Control de Flujo de Efectivo</CardTitle>
          <CardDescription>
            Ingrese con su usuario corporativo. La validación se realiza contra la base de datos
            SQL Server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input
                id="usuario"
                autoComplete="username"
                autoFocus
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                onKeyDown={alPresionarEnter}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrasena">Contraseña</Label>
              <CampoContrasena
                id="contrasena"
                autoComplete="current-password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Ingresar
            </Button>
          </form>

          <div className="mt-6 border-t pt-4">
            <button
              type="button"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setEditandoServidor((v) => !v)}
            >
              <ServerCog className="size-3.5" aria-hidden />
              Servidor: {urlApi() || "no configurado"}
            </button>
            {editandoServidor && (
              <div className="mt-3 space-y-2">
                <Label htmlFor="servidor" className="text-xs">
                  URL de la API (por ejemplo http://localhost:5080/api)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="servidor"
                    value={servidor}
                    onChange={(e) => setServidor(e.target.value)}
                    placeholder="http://localhost:5080/api"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!servidor.trim() || probandoServidor}
                    onClick={async () => {
                      setError(null);
                      setProbandoServidor(true);
                      try {
                        const urlValidada = await probarConexionApi(servidor);
                        configurarUrlApi(urlValidada);
                        window.location.reload();
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : "No fue posible validar el servidor",
                        );
                        setProbandoServidor(false);
                      }
                    }}
                  >
                    {probandoServidor && (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    )}
                    {probandoServidor ? "Probando" : "Guardar"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Tag className="size-3.5" aria-hidden />
            <span>
              Versión {APP_VERSION} — {APP_FECHA_VERSION}
            </span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
