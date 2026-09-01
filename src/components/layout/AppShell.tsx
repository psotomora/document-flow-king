import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Banknote,
  BookLock,
  Building2,
  CalendarClock,
  FileSpreadsheet,
  FileText,
  Landmark,
  LogOut,
  PiggyBank,
  Receipt,
  Settings2,
  ShoppingCart,
  TrendingUp,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";
import { filtrarPorCompania, useApp, usuariosDemo } from "@/contexto/AppContexto";
import { formatearFecha, formatearNumero } from "@/lib/formato";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ConexionApi } from "@/components/layout/ConexionApi";
import { VersionApp } from "@/components/layout/VersionApp";
import logoAplixAsset from "@/assets/aplix-isotipo.png.asset.json";




const navegacion = [
  {
    grupo: "Operación",
    items: [
      { to: "/", etiqueta: "Tablero", icono: BarChart3 },
      { to: "/facturas", etiqueta: "Facturas por cobrar", icono: FileText },
      { to: "/pagos", etiqueta: "Pagos recibidos", icono: Receipt },
      { to: "/erogaciones", etiqueta: "Erogaciones", icono: Banknote },
      { to: "/bancos", etiqueta: "Saldo por banco", icono: Landmark },
    ],
  },
  {
    grupo: "Proyección",
    items: [
      { to: "/proyeccion", etiqueta: "Proyección de cobros", icono: TrendingUp },
      { to: "/contratos", etiqueta: "Contratos", icono: CalendarClock },
      { to: "/pedidos", etiqueta: "Pedidos pendientes", icono: ShoppingCart },
      { to: "/consolidado", etiqueta: "Saldo consolidado", icono: PiggyBank },
    ],
  },
  {
    grupo: "Administración",
    items: [
      { to: "/catalogos", etiqueta: "Catálogos", icono: Building2 },
      { to: "/parametros", etiqueta: "Tipo de cambio", icono: Settings2 },
      { to: "/bitacora", etiqueta: "Bitácora", icono: BookLock },
      { to: "/importar", etiqueta: "Carga inicial", icono: Upload },
      { to: "/acceso", etiqueta: "Usuarios y perfiles", icono: FileSpreadsheet },
    ],
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const {
    companias,
    companiaActiva,
    setCompaniaActiva,
    usuario,
    cambiarUsuario,
    hoy,
    tipoCambio,
    modoApi,
    cerrarSesion,
  } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex flex-col items-center border-b border-sidebar-border px-5 py-4">
          <img
            src={logoAplix}
            alt="Aplix"
            className="mb-2 h-10 w-auto object-contain"
          />
          <div className="text-center leading-tight">
            <p className="text-sm font-semibold">Aplix Cash Flow Insights</p>
            <p className="text-xs text-sidebar-foreground/70">Flujo de Efectivo</p>
          </div>
        </div>


        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navegacion.map((seccion) => (
            <div key={seccion.grupo}>
              <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
                {seccion.grupo}
              </p>
              <ul className="space-y-0.5">
                {seccion.items.map((item) => {
                  const activo =
                    item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  const Icono = item.icono;
                  return (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                          activo
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        )}
                      >
                        <Icono className="size-4 shrink-0" />
                        <span className="truncate">{item.etiqueta}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/60">
          <p>Maqueta de demostración</p>
          <p>Fecha de corte: {formatearFecha(hoy)}</p>
          <VersionApp />
        </div>

      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur lg:px-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Compañía</span>
            <Select
              value={companiaActiva}
              onValueChange={(v) => setCompaniaActiva(v as string)}
            >
              <SelectTrigger className="h-8 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las compañías</SelectItem>
                {companias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} — {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="hidden items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs md:flex">
            <span className="text-muted-foreground">Tipo de cambio</span>
            <span className="font-mono font-medium tabular-nums">
              ₡{formatearNumero(tipoCambio)}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ConexionApi />
            <Select value={usuario.id} onValueChange={cambiarUsuario}>

              <SelectTrigger className="h-8 w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {usuariosDemo.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nombre} · {u.perfil}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modoApi ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={cerrarSesion}
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="gap-1.5">
                <Link to="/acceso">
                  <LogOut className="size-4" />
                  <span className="hidden sm:inline">Sesión</span>
                </Link>
              </Button>
            )}
          </div>
        </header>

        <main className="min-w-0 flex-1 space-y-6 px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}

export { filtrarPorCompania };
