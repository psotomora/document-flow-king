import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  ClipboardList,
  FileText,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Tag,
  TrendingUp,
} from "lucide-react";
import { useApp } from "@/contexto/AppContexto";
import { recuperarContrasena, urlApi } from "@/lib/api";
import { APP_FECHA_VERSION, APP_VERSION } from "@/lib/version";
import { Button } from "@/components/ui/button";
import { CampoContrasena } from "@/components/comunes/CampoContrasena";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import isotipoBlanco from "@/assets/isotipo-blanco.png.asset.json";

// IIS no sirve /__l5e/assets-v1: resolver el puntero desde su origen público.
const isotipoBlancoUrl = new URL(isotipoBlanco.url, "https://document-flow-king.lovable.app").href;

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Pantalla de autenticación contra la API .NET (tabla flujo.Usuario + JWT). */
export function PantallaLogin() {
  const { autenticar, entrarDemostracion } = useApp();
  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [demostracion, setDemostracion] = useState(false);
  const [versionApi, setVersionApi] = useState<string | null>(null);
  const [recuperando, setRecuperando] = useState(false);
  const [enviandoRecuperacion, setEnviandoRecuperacion] = useState(false);
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState<string | null>(null);

  // Lee la versión expuesta por la API en /api/salud.
  useEffect(() => {
    const base = urlApi();
    if (!base) {
      setVersionApi(null);
      return;
    }
    const ctrl = new AbortController();
    fetch(`${base}/salud`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    })
      .then(async (r) => {
        const texto = await r.text();
        let datos: { versionApi?: string } | null = null;
        try {
          datos = JSON.parse(texto) as { versionApi?: string };
        } catch {
          datos = null;
        }
        setVersionApi(
          datos?.versionApi ??
            r.headers.get("X-FlujoEfectivo-Api-Version") ??
            null,
        );
      })
      .catch(() => setVersionApi(null));
    return () => ctrl.abort();
  }, []);

  async function enviar(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    if (demostracion) {
      entrarDemostracion();
      return;
    }
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
    <main className="grid min-h-screen bg-muted/40 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <aside className="relative flex flex-col overflow-hidden bg-sidebar px-6 py-6 text-sidebar-foreground sm:sticky sm:top-0 sm:h-screen sm:py-8">
        {/* Aro decorativo en la esquina superior derecha. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-36 z-0 size-96 rounded-full border-[30px] border-sidebar-accent/60"
        />

        {/* Marca de la aplicación con su versión, en la esquina superior izquierda. */}
        <div className="relative z-10 flex items-center gap-2.5">
          <img src={isotipoBlancoUrl} alt="" className="h-8 w-8 shrink-0 object-contain" />
          <div className="min-w-0 leading-tight">
            <p className="text-sm text-sidebar-foreground/80">
              Aplix <span className="font-semibold text-sidebar-foreground">Cash Flow Insights</span>
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-sidebar-foreground/70">
              Flujo de efectivo
            </p>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-sidebar-foreground/60">
              <ClipboardList className="size-3" aria-hidden />
              v{APP_VERSION}
            </p>
          </div>
        </div>

        {/* Isotipo y textos de la suite, centrados en el panel. */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center py-12 text-center">
          <div className="relative flex h-40 w-40 items-center justify-center">
            <div aria-hidden className="absolute inset-0 rounded-full bg-sidebar-primary/30 blur-3xl" />
            <img src={isotipoBlancoUrl} alt="" className="relative h-28 w-28 object-contain" />
          </div>
          <p className="mt-4 font-display text-4xl font-bold text-sidebar-foreground">Aplix Apps</p>
          <p className="mt-1 text-sm font-medium uppercase text-sidebar-foreground">Suite de Productividad</p>
        </div>

        {/* Bajada con los puntos fuertes de la aplicación, al pie del panel. */}
        <div className="relative z-10 max-w-sm pb-2 lg:pb-4">
          <p className="font-display text-[26px] font-bold leading-tight">
            Cada cobro, pago y contrato, proyectados en un solo lugar.
          </p>
          <ul className="mt-4 space-y-2.5">
            <li className="flex items-start gap-2.5 text-sm text-sidebar-foreground/90">
              <FileText className="mt-0.5 size-4 shrink-0 text-sidebar-foreground/70" aria-hidden />
              <span>Lee facturas, pedidos y contratos del ERP Softland</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-sidebar-foreground/90">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-sidebar-foreground/70" aria-hidden />
              <span>Proyecta el saldo por cobrar y el flujo del mes</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-sidebar-foreground/90">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sidebar-foreground/70" aria-hidden />
              <span>Concilia estados de cuenta y deja bitácora de todo</span>
            </li>
          </ul>
        </div>
      </aside>
      <section aria-label="Ingreso a Flujo de Efectivo" className="flex min-w-0 flex-col items-center justify-center px-4 py-10 sm:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <LockKeyhole className="size-5" aria-hidden />
          </div>
          <CardTitle>Control de Flujo de Efectivo</CardTitle>
          <CardDescription>
            {demostracion
              ? "Modo demostración: se usan datos de prueba, sin conexión a SQL Server."
              : "Ingrese con su usuario corporativo. La validación se realiza contra la base de datos SQL Server."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="demo" className="text-sm font-medium">
              Modo demostración
            </Label>
            <Switch
              id="demo"
              checked={demostracion}
              onCheckedChange={(v) => {
                setDemostracion(v);
                setError(null);
              }}
            />
          </div>

          <form onSubmit={enviar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input
                id="usuario"
                autoComplete="username"
                autoFocus
                disabled={demostracion}
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                onKeyDown={alPresionarEnter}
                required={!demostracion}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contrasena">Contraseña</Label>
              <CampoContrasena
                id="contrasena"
                autoComplete="current-password"
                disabled={demostracion}
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                onKeyDown={alPresionarEnter}
                required={!demostracion}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              {demostracion ? "Entrar en modo demostración" : "Ingresar"}
            </Button>

            {!demostracion && (
              <div className="text-center">
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setRecuperando((v) => !v);
                    setMensajeRecuperacion(null);
                    setError(null);
                  }}
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
            )}

            {recuperando && !demostracion && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  Se enviará una contraseña temporal al correo registrado del usuario.
                </p>
                <div className="flex gap-2">
                  <Input
                    aria-label="Usuario a recuperar"
                    placeholder="Nombre de usuario"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!usuario.trim() || enviandoRecuperacion}
                    onClick={async () => {
                      setError(null);
                      setMensajeRecuperacion(null);
                      setEnviandoRecuperacion(true);
                      try {
                        setMensajeRecuperacion(await recuperarContrasena(usuario.trim()));
                      } catch (err) {
                        setError(
                          err instanceof Error ? err.message : "No fue posible recuperar la contraseña",
                        );
                      } finally {
                        setEnviandoRecuperacion(false);
                      }
                    }}
                  >
                    {enviandoRecuperacion && (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    )}
                    {enviandoRecuperacion ? "Enviando" : "Enviar"}
                  </Button>
                </div>
                {mensajeRecuperacion && (
                  <p role="status" className="text-sm font-medium text-exito">
                    {mensajeRecuperacion}
                  </p>
                )}
              </div>
            )}
          </form>


          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <Tag className="size-3.5" aria-hidden />
            <span>
              Versión app {APP_VERSION} — {APP_FECHA_VERSION}
            </span>
            <span aria-hidden>·</span>
            <span>
              {versionApi ? `Versión API ${versionApi}` : "API no detectada"}
            </span>
          </div>
        </CardContent>
      </Card>
      </section>
    </main>
  );
}
