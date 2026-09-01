import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import * as semilla from "@/data/semilla";
import type {
  Banco,
  Compania,
  Contrato,
  Erogacion,
  Factura,
  OperacionBitacora,
  Pago,
  Pedido,
  Perfil,
  RegistroBitacora,
  TipoCambio,
  Usuario,
} from "@/data/tipos";
import { calcularFacturas, type FacturaCalculada } from "@/lib/calculos";
import { api, guardarToken, hayApi, obtenerToken } from "@/lib/api";
import { pedidosPendientesDeContratos } from "@/lib/contratos";


let contador = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}-${contador++}`;

/** Respuesta de GET /estado en la API .NET. */
interface EstadoServidor {
  usuario: Usuario;
  companias: Compania[];
  bancos: Banco[];
  facturas: Factura[];
  pagos: Pago[];
  erogaciones: Erogacion[];
  contratos: Contrato[];
  pedidos: Pedido[];
  tiposCambio: TipoCambio[];
  bitacora: RegistroBitacora[];
}

interface EstadoApp {
  hoy: string;
  usuario: Usuario;
  perfil: Perfil;
  autenticado: boolean;
  sesionCerrada: boolean;
  modoApi: boolean;
  cargando: boolean;
  errorApi: string | null;
  companiaActiva: string | "todas";
  companias: Compania[];
  bancos: Banco[];
  facturas: Factura[];
  pagos: Pago[];
  erogaciones: Erogacion[];
  contratos: Contrato[];
  pedidos: Pedido[];
  tiposCambio: TipoCambio[];
  tipoCambio: number;
  bitacora: RegistroBitacora[];
  facturasCalculadas: FacturaCalculada[];
  puedeEditar: boolean;
  esAdministrador: boolean;
  iniciarSesion: (usuarioId: string) => void;
  autenticar: (usuario: string, contrasena: string) => Promise<void>;
  recargar: () => Promise<void>;
  cerrarSesion: () => void;
  volverAlLogin: () => void;
  cambiarUsuario: (usuarioId: string) => void;
  setCompaniaActiva: (id: string | "todas") => void;
  agregarFactura: (f: Omit<Factura, "id">) => void;
  eliminarFactura: (id: string) => void;
  agregarPago: (p: Omit<Pago, "id">) => void;
  eliminarPago: (id: string) => void;
  agregarErogacion: (e: Omit<Erogacion, "id">) => void;
  eliminarErogacion: (id: string) => void;
  agregarContrato: (c: Omit<Contrato, "id">) => void;
  actualizarContrato: (id: string, cambios: Partial<Contrato>) => void;
  eliminarContrato: (id: string) => void;
  agregarPedido: (p: Omit<Pedido, "id">) => void;
  actualizarPedido: (id: string, cambios: Partial<Pedido>) => void;
  eliminarPedido: (id: string) => void;
  agregarBanco: (b: Omit<Banco, "id">) => void;
  actualizarBanco: (id: string, cambios: Partial<Banco>) => void;
  registrarTipoCambio: (valor: number, nota?: string) => void;
  importarLote: (datos: {
    facturas?: Omit<Factura, "id">[];
    pagos?: Omit<Pago, "id">[];
    erogaciones?: Omit<Erogacion, "id">[];
  }) => void;
  reiniciar: () => void;
}

const Contexto = createContext<EstadoApp | null>(null);

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [modoApi, setModoApi] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [autenticado, setAutenticado] = useState(true);
  const [sesionCerrada, setSesionCerrada] = useState(false);
  const [usuario, setUsuario] = useState<Usuario>(semilla.usuarios[0]!);
  const [companiaActiva, setCompaniaActiva] = useState<string | "todas">("todas");
  const [companias, setCompanias] = useState<Compania[]>(semilla.companias);
  const [bancos, setBancos] = useState<Banco[]>(semilla.bancos);
  const [facturas, setFacturas] = useState<Factura[]>(semilla.facturas);
  const [pagos, setPagos] = useState<Pago[]>(semilla.pagos);
  const [erogaciones, setErogaciones] = useState<Erogacion[]>(semilla.erogaciones);
  const [contratos, setContratos] = useState<Contrato[]>(semilla.contratos);
  const [pedidos, setPedidos] = useState<Pedido[]>(semilla.pedidos);
  const [tiposCambio, setTiposCambio] = useState<TipoCambio[]>(semilla.tiposCambio);
  const [bitacora, setBitacora] = useState<RegistroBitacora[]>(semilla.bitacoraInicial);
  const iniciado = useRef(false);

  const hoy = modoApi ? new Date().toISOString().slice(0, 10) : semilla.FECHA_CORTE;
  const tipoCambio = tiposCambio[tiposCambio.length - 1]?.valor ?? 0;

  const aplicarEstado = useCallback((estado: EstadoServidor) => {
    setUsuario(estado.usuario);
    setCompanias(estado.companias);
    setBancos(estado.bancos);
    setFacturas(estado.facturas);
    setPagos(estado.pagos);
    setErogaciones(estado.erogaciones);
    setContratos(estado.contratos);
    setPedidos(estado.pedidos);
    setTiposCambio(estado.tiposCambio);
    setBitacora(estado.bitacora);
  }, []);

  const recargar = useCallback(async () => {
    if (!hayApi()) return;
    setCargando(true);
    try {
      const estado = await api<EstadoServidor>("/estado");
      aplicarEstado(estado);
      setAutenticado(true);
      setErrorApi(null);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Error desconocido";
      setErrorApi(mensaje);
      if (mensaje.includes("Sesión")) setAutenticado(false);
    } finally {
      setCargando(false);
    }
  }, [aplicarEstado]);

  // Arranque: detecta si hay API configurada y restaura la sesión guardada.
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    if (!hayApi()) {
      setModoApi(false);
      setAutenticado(true);
      return;
    }
    setModoApi(true);
    if (!obtenerToken()) {
      setAutenticado(false);
      return;
    }
    void recargar();
  }, [recargar]);

  const autenticar = useCallback(
    async (nombreUsuario: string, contrasena: string) => {
      const resp = await api<{ token: string; usuario: Usuario }>("/auth/login", {
        metodo: "POST",
        cuerpo: { usuario: nombreUsuario, contrasena },
        sinToken: true,
      });
      guardarToken(resp.token);
      setUsuario(resp.usuario);
      setAutenticado(true);
      setSesionCerrada(false);
      await recargar();
    },
    [recargar],
  );

  /** Ejecuta una mutación contra la API y recarga el estado; en modo demo usa el callback local. */
  const mutar = useCallback(
    (ruta: string, metodo: string, cuerpo: unknown, local: () => void) => {
      if (!hayApi()) {
        local();
        return;
      }
      void (async () => {
        try {
          await api(ruta, { metodo, cuerpo });
          await recargar();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "No se pudo guardar el cambio");
        }
      })();
    },
    [recargar],
  );

  const anotar = useCallback(
    (
      modulo: string,
      registro: string,
      operacion: OperacionBitacora,
      valorNuevo?: string,
      valorAnterior?: string,
    ) => {
      if (hayApi()) return; // la API registra la bitácora en SQL Server
      setBitacora((prev) => [
        {
          id: nuevoId("bit"),
          fechaHora: `${hoy}T${new Date().toISOString().slice(11, 16)}`,
          usuario: usuario.nombre,
          modulo,
          registro,
          operacion,
          valorNuevo,
          valorAnterior,
        },
        ...prev,
      ]);
    },
    [hoy, usuario.nombre],
  );

  const facturasCalculadas = useMemo(
    () => calcularFacturas(facturas, pagos, hoy),
    [facturas, pagos, hoy],
  );

  // Genera automáticamente los pedidos de contratos activos cuya próxima
  // facturación ya venció y que todavía no tienen pedido asociado (RF-011).
  const pedidosGenerados = useRef(new Set<string>());
  useEffect(() => {
    if (!autenticado || cargando || contratos.length === 0) return;
    const pendientes = pedidosPendientesDeContratos(contratos, pedidos, hoy).filter(
      (g) => !pedidosGenerados.current.has(g.pedido.numero),
    );
    if (pendientes.length === 0) return;
    pendientes.forEach((g) => pedidosGenerados.current.add(g.pedido.numero));

    const ultimaPorContrato = new Map<string, string>();
    pendientes.forEach((g) => ultimaPorContrato.set(g.contratoId, g.proximaFacturacion));

    if (!hayApi()) {
      setPedidos((prev) => [
        ...pendientes.map((g) => ({ ...g.pedido, id: nuevoId("pd") })),
        ...prev,
      ]);
      setContratos((prev) =>
        prev.map((c) =>
          ultimaPorContrato.has(c.id)
            ? { ...c, proximaFacturacion: ultimaPorContrato.get(c.id)!, facturado: false }
            : c,
        ),
      );
      pendientes.forEach((g) => {
        anotar(
          "Pedidos",
          g.pedido.numero,
          "Creación",
          `Generado automáticamente del contrato ${g.numeroContrato}`,
        );
      });
    } else {
      void (async () => {
        try {
          for (const g of pendientes) {
            await api("/pedidos", { metodo: "POST", cuerpo: g.pedido });
          }
          for (const [contratoId, proximaFacturacion] of ultimaPorContrato) {
            await api(`/contratos/${contratoId}`, {
              metodo: "PUT",
              cuerpo: { proximaFacturacion, facturado: false },
            });
          }
          await recargar();
        } catch (e) {
          toast.error(
            e instanceof Error ? e.message : "No se pudieron generar los pedidos de contratos",
          );
        }
      })();
    }

    toast.info(
      pendientes.length === 1
        ? `Se generó 1 pedido a partir de contratos vigentes.`
        : `Se generaron ${pendientes.length} pedidos a partir de contratos vigentes.`,
    );
  }, [anotar, autenticado, cargando, contratos, hoy, pedidos, recargar]);


  const valor = useMemo<EstadoApp>(() => {
    const puedeEditar = usuario.perfil !== "consulta";
    const esAdministrador = usuario.perfil === "administrador";

    return {
      hoy,
      usuario,
      perfil: usuario.perfil,
      autenticado,
      sesionCerrada,
      modoApi,
      cargando,
      errorApi,
      companiaActiva,
      companias,
      bancos,
      facturas,
      pagos,
      erogaciones,
      contratos,
      pedidos,
      tiposCambio,
      tipoCambio,
      bitacora,
      facturasCalculadas,
      puedeEditar,
      esAdministrador,
      autenticar,
      recargar,
      iniciarSesion: (usuarioId) => {
        const u = semilla.usuarios.find((x) => x.id === usuarioId);
        if (u) setUsuario(u);
        setAutenticado(true);
      },
      cerrarSesion: () => {
        guardarToken(null);
        setAutenticado(false);
        setSesionCerrada(true);
      },
      volverAlLogin: () => setSesionCerrada(false),
      cambiarUsuario: (usuarioId) => {
        const u = semilla.usuarios.find((x) => x.id === usuarioId);
        if (u) setUsuario(u);
      },
      setCompaniaActiva,
      agregarFactura: (f) =>
        mutar("/facturas", "POST", f, () => {
          setFacturas((prev) => [{ ...f, id: nuevoId("f") }, ...prev]);
          anotar("Facturas", f.numero, "Creación", `Monto: ${f.monto}`);
        }),
      eliminarFactura: (id) =>
        mutar(`/facturas/${id}`, "DELETE", undefined, () => {
          const f = facturas.find((x) => x.id === id);
          setFacturas((prev) => prev.filter((x) => x.id !== id));
          setPagos((prev) => prev.filter((p) => p.facturaId !== id));
          if (f) anotar("Facturas", f.numero, "Eliminación", undefined, `Monto: ${f.monto}`);
        }),
      agregarPago: (p) =>
        mutar("/pagos", "POST", p, () => {
          setPagos((prev) => [{ ...p, id: nuevoId("p") }, ...prev]);
          anotar("Pagos", p.referencia ?? "Pago", "Creación", `Monto: ${p.monto}`);
        }),
      eliminarPago: (id) =>
        mutar(`/pagos/${id}`, "DELETE", undefined, () => {
          const p = pagos.find((x) => x.id === id);
          setPagos((prev) => prev.filter((x) => x.id !== id));
          if (p)
            anotar("Pagos", p.referencia ?? "Pago", "Eliminación", undefined, `Monto: ${p.monto}`);
        }),
      agregarErogacion: (e) =>
        mutar("/erogaciones", "POST", e, () => {
          setErogaciones((prev) => [{ ...e, id: nuevoId("e") }, ...prev]);
          anotar("Erogaciones", e.numeroTransferencia, "Creación", `Monto: ${e.monto}`);
        }),
      eliminarErogacion: (id) =>
        mutar(`/erogaciones/${id}`, "DELETE", undefined, () => {
          const e = erogaciones.find((x) => x.id === id);
          setErogaciones((prev) => prev.filter((x) => x.id !== id));
          if (e)
            anotar(
              "Erogaciones",
              e.numeroTransferencia,
              "Eliminación",
              undefined,
              `Monto: ${e.monto}`,
            );
        }),
      agregarContrato: (c) =>
        mutar("/contratos", "POST", c, () => {
          setContratos((prev) => [{ ...c, id: nuevoId("c") }, ...prev]);
          anotar("Contratos", c.numero, "Creación", `Monto: ${c.monto}`);
        }),
      actualizarContrato: (id, cambios) =>
        mutar(`/contratos/${id}`, "PUT", cambios, () => {
          setContratos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
          const c = contratos.find((x) => x.id === id);
          if (c) anotar("Contratos", c.numero, "Modificación", JSON.stringify(cambios));
        }),
      eliminarContrato: (id) =>
        mutar(`/contratos/${id}`, "DELETE", undefined, () => {
          const c = contratos.find((x) => x.id === id);
          setContratos((prev) => prev.filter((x) => x.id !== id));
          if (c) anotar("Contratos", c.numero, "Eliminación");
        }),
      agregarPedido: (p) =>
        mutar("/pedidos", "POST", p, () => {
          setPedidos((prev) => [{ ...p, id: nuevoId("pd") }, ...prev]);
          anotar("Pedidos", p.numero, "Creación", `Monto: ${p.monto}`);
        }),
      actualizarPedido: (id, cambios) =>
        mutar(`/pedidos/${id}`, "PUT", cambios, () => {
          setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
          const p = pedidos.find((x) => x.id === id);
          if (p) anotar("Pedidos", p.numero, "Modificación", JSON.stringify(cambios));
        }),
      eliminarPedido: (id) =>
        mutar(`/pedidos/${id}`, "DELETE", undefined, () => {
          const p = pedidos.find((x) => x.id === id);
          setPedidos((prev) => prev.filter((x) => x.id !== id));
          if (p) anotar("Pedidos", p.numero, "Eliminación");
        }),
      agregarBanco: (b) =>
        mutar("/bancos", "POST", b, () => {
          setBancos((prev) => [...prev, { ...b, id: nuevoId("bk") }]);
          anotar("Catálogos", b.nombre, "Creación");
        }),
      actualizarBanco: (id, cambios) =>
        mutar(`/bancos/${id}`, "PUT", cambios, () => {
          setBancos((prev) => prev.map((b) => (b.id === id ? { ...b, ...cambios } : b)));
          const b = bancos.find((x) => x.id === id);
          if (b) anotar("Catálogos", b.nombre, "Modificación", JSON.stringify(cambios));
        }),
      registrarTipoCambio: (nuevoValor, nota) =>
        mutar("/tipos-cambio", "POST", { valor: nuevoValor, nota }, () => {
          const anterior = tipoCambio;
          setTiposCambio((prev) => [
            ...prev,
            {
              id: nuevoId("tc"),
              valor: nuevoValor,
              fecha: `${hoy}T${new Date().toISOString().slice(11, 16)}`,
              usuario: usuario.nombre,
              nota,
            },
          ]);
          anotar(
            "Parámetros",
            "Tipo de cambio",
            "Modificación",
            nota ? `${nuevoValor} (${nota})` : String(nuevoValor),
            String(anterior),
          );
        }),
      importarLote: (datos) =>
        mutar("/importacion/lote", "POST", datos, () => {
          if (datos.facturas?.length)
            setFacturas((prev) => [
              ...datos.facturas!.map((f) => ({ ...f, id: nuevoId("f") })),
              ...prev,
            ]);
          if (datos.pagos?.length)
            setPagos((prev) => [...datos.pagos!.map((p) => ({ ...p, id: nuevoId("p") })), ...prev]);
          if (datos.erogaciones?.length)
            setErogaciones((prev) => [
              ...datos.erogaciones!.map((e) => ({ ...e, id: nuevoId("e") })),
              ...prev,
            ]);
          anotar("Carga inicial", "Importación", "Creación", "Lote incorporado");
        }),
      reiniciar: () => {
        if (hayApi()) {
          void recargar();
          return;
        }
        setCompanias(semilla.companias);
        setBancos(semilla.bancos);
        setFacturas(semilla.facturas);
        setPagos(semilla.pagos);
        setErogaciones(semilla.erogaciones);
        setContratos(semilla.contratos);
        setPedidos(semilla.pedidos);
        setTiposCambio(semilla.tiposCambio);
        setBitacora(semilla.bitacoraInicial);
      },
    };
  }, [
    anotar,
    autenticar,
    autenticado,
    bancos,
    bitacora,
    cargando,
    companiaActiva,
    companias,
    contratos,
    erogaciones,
    errorApi,
    facturas,
    facturasCalculadas,
    hoy,
    modoApi,
    mutar,
    pagos,
    pedidos,
    recargar,
    tipoCambio,
    tiposCambio,
    usuario,
  ]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useApp(): EstadoApp {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useApp debe usarse dentro de ProveedorApp");
  return ctx;
}

/** Filtra cualquier colección por la compañía activa del encabezado. */
export function filtrarPorCompania<T extends { companiaId: string }>(
  items: T[],
  companiaActiva: string | "todas",
): T[] {
  return companiaActiva === "todas" ? items : items.filter((i) => i.companiaId === companiaActiva);
}

export const usuariosDemo = semilla.usuarios;
