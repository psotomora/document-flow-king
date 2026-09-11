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
  DocumentoPorCobrar,
  DocumentoPorPagar,
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
import { api, ErrorApi, guardarToken, hayApi, obtenerToken } from "@/lib/api";
import {
  contratosPorFacturarDelMes,
  pedidosPendientesDeContratos,
  type ContratoDelMes,
} from "@/lib/contratos";


let contador = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}-${contador++}`;

/** Respuesta de GET /estado en la API .NET. */
interface EstadoServidor {
  usuario: Usuario;
  usuarios?: Usuario[];
  companias: Compania[];
  bancos: Banco[];
  facturas: Factura[];
  pagos: Pago[];
  erogaciones: Erogacion[];
  documentosPorPagar?: DocumentoPorPagar[];
  documentosPorCobrar?: DocumentoPorCobrar[];
  contratos: Contrato[];
  pedidos: Pedido[];
  tiposCambio: TipoCambio[];
  bitacora: RegistroBitacora[];
  parametros?: Record<string, string>;
  preferencias?: Record<string, string>;
  avisoFuenteExterna?: string | null;
}

/** Clave del parámetro que indica si los pedidos se leen de una fuente externa. */
export const PARAM_PEDIDOS_FUENTE_EXTERNA = "pedidosFuenteExterna";
/** Clave del parámetro que indica si las facturas se leen de una fuente externa. */
export const PARAM_FACTURAS_FUENTE_EXTERNA = "facturasFuenteExterna";
/** Clave del parámetro que indica si los documentos por pagar se leen de una fuente externa. */
export const PARAM_DOCUMENTOS_PAGO_FUENTE_EXTERNA = "documentosPagoFuenteExterna";
/** Clave del parámetro que indica si los documentos por cobrar se leen de una fuente externa. */
export const PARAM_DOCUMENTOS_COBRO_FUENTE_EXTERNA = "documentosCobroFuenteExterna";
/** Clave del parámetro que indica si los contratos recurrentes se leen de una fuente externa. */
export const PARAM_CONTRATOS_FUENTE_EXTERNA = "contratosFuenteExterna";
/** Clave del subparámetro que indica cuál es la fuente externa (compartida por pedidos y facturas). */
export const PARAM_PEDIDOS_FUENTE_ORIGEN = "pedidosFuenteOrigen";
/** Fuentes externas de pedidos disponibles. */
export const FUENTES_PEDIDOS: { valor: string; etiqueta: string }[] = [
  { valor: "SoftlandERP", etiqueta: "SoftlandERP" },
];
export const FUENTE_PEDIDOS_DEFECTO = "SoftlandERP";
/** Preferencia que recuerda el último mes revisado de contratos por facturar. */
export const PREF_CONTRATOS_MES_REVISADO = "contratosMesRevisado";
/** Preferencias de los filtros de la subsección de contratos del mes. */
export const PREF_CONTRATOS_MES_FILTROS = "contratosMesFiltros";
/** Marcas históricas de contratos del mes indicados como pagados por el usuario. */
export const PREF_CONTRATOS_MES_PAGADOS = "contratosMesPagados";
/** Histórico de meses cerrados de contratos por facturar. */
export const PREF_CONTRATOS_MES_HISTORICO = "contratosMesHistorico";
/** Parámetro: al cambio de mes se archivan los contratos del mes anterior y se limpia la lista. */
export const PARAM_CONTRATOS_MES_LIMPIAR = "contratosMesLimpiar";

/** Línea archivada de un mes ya cerrado. */
export interface LineaHistoricoContrato {
  contratoId: string;
  companiaId: string;
  numero: string;
  cliente: string;
  periodicidad: string;
  fecha: string;
  moneda: string;
  monto: number;
  pagado: boolean;
  documento?: string;
}

/** Mes cerrado de contratos por facturar. */
export interface MesHistoricoContratos {
  mes: string;
  archivadoEn: string;
  lineas: LineaHistoricoContrato[];
}

const PARAMETROS_DEFECTO: Record<string, string> = {
  [PARAM_PEDIDOS_FUENTE_EXTERNA]: "0",
  [PARAM_FACTURAS_FUENTE_EXTERNA]: "0",
  [PARAM_DOCUMENTOS_PAGO_FUENTE_EXTERNA]: "0",
  [PARAM_DOCUMENTOS_COBRO_FUENTE_EXTERNA]: "0",
  [PARAM_CONTRATOS_FUENTE_EXTERNA]: "0",
  [PARAM_CONTRATOS_MES_LIMPIAR]: "0",
  [PARAM_PEDIDOS_FUENTE_ORIGEN]: FUENTE_PEDIDOS_DEFECTO,
};

interface EstadoApp {
  hoy: string;
  usuario: Usuario;
  usuarios: Usuario[];
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
  documentosPorPagar: DocumentoPorPagar[];
  documentosPorCobrar: DocumentoPorCobrar[];
  contratos: Contrato[];
  pedidos: Pedido[];
  tiposCambio: TipoCambio[];
  tipoCambio: number;
  bitacora: RegistroBitacora[];
  parametros: Record<string, string>;
  /** Preferencias personales del usuario (filtros recordados). */
  preferencias: Record<string, string>;
  actualizarPreferencia: (clave: string, valor: string) => void;
  /** Contratos activos que deben facturarse en el mes corriente. */
  contratosDelMes: ContratoDelMes[];
  /** Meses ya cerrados y archivados de contratos por facturar. */
  contratosMesHistorico: MesHistoricoContratos[];
  /** Si está activo, al cambio de mes se archiva y limpia la lista del mes anterior. */
  contratosMesLimpiar: boolean;
  pedidosFuenteExterna: boolean;
  facturasFuenteExterna: boolean;
  documentosPagoFuenteExterna: boolean;
  documentosCobroFuenteExterna: boolean;
  contratosFuenteExterna: boolean;
  pedidosFuenteOrigen: string;
  /** Mensaje del servidor cuando la fuente externa está activa pero no pudo leerse. */
  avisoFuenteExterna: string | null;
  actualizarParametro: (clave: string, valor: string) => void;
  facturasCalculadas: FacturaCalculada[];
  puedeEditar: boolean;
  esAdministrador: boolean;
  iniciarSesion: (usuarioId: string) => void;
  autenticar: (usuario: string, contrasena: string) => Promise<void>;
  /** Entra a la aplicación con los datos de prueba, sin conectarse a SQL Server. */
  entrarDemostracion: () => void;
  recargar: () => Promise<void>;
  cerrarSesion: () => void;
  volverAlLogin: () => void;

  cambiarUsuario: (usuarioId: string) => void;
  crearUsuario: (datos: {
    nombre: string;
    nombreUsuario: string;
    correo?: string;
    perfil: Perfil;
    activo: boolean;
    contrasena?: string;
    verBancos?: boolean;
    verConsolidado?: boolean;
    verErogaciones?: boolean;
    verProyeccion?: boolean;
    verCatalogos?: boolean;
    editarErogaciones?: boolean;
  }) => Promise<void>;
  actualizarUsuario: (
    id: string,
    cambios: {
      nombre?: string;
      nombreUsuario?: string;
      correo?: string;
      perfil?: Perfil;
      activo?: boolean;
      contrasena?: string;
      verBancos?: boolean;
      verConsolidado?: boolean;
      verErogaciones?: boolean;
      verProyeccion?: boolean;
      verCatalogos?: boolean;
      editarErogaciones?: boolean;
    },
  ) => Promise<void>;
  eliminarUsuario: (id: string) => Promise<void>;
  setCompaniaActiva: (id: string | "todas") => void;
  agregarFactura: (f: Omit<Factura, "id">) => void;
  eliminarFactura: (id: string) => void;
  agregarPago: (p: Omit<Pago, "id">) => Promise<boolean>;
  eliminarPago: (id: string) => void;
  agregarErogacion: (e: Omit<Erogacion, "id">) => void;
  actualizarErogacion: (id: string, cambios: Omit<Erogacion, "id">) => void;
  eliminarErogacion: (id: string) => void;
  agregarDocumentoPorPagar: (d: Omit<DocumentoPorPagar, "id">) => void;
  actualizarDocumentoPorPagar: (id: string, cambios: Partial<DocumentoPorPagar>) => void;
  eliminarDocumentoPorPagar: (id: string) => void;
  agregarDocumentoPorCobrar: (d: Omit<DocumentoPorCobrar, "id">) => void;
  actualizarDocumentoPorCobrar: (id: string, cambios: Partial<DocumentoPorCobrar>) => void;
  eliminarDocumentoPorCobrar: (id: string) => void;
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
  // La aplicación siempre arranca en la pantalla de inicio de sesión.
  const [autenticado, setAutenticado] = useState(false);

  const [sesionCerrada, setSesionCerrada] = useState(false);
  const [usuario, setUsuario] = useState<Usuario>(semilla.usuarios[0]!);
  const [usuarios, setUsuarios] = useState<Usuario[]>(semilla.usuarios);
  const [companiaActiva, setCompaniaActiva] = useState<string | "todas">("todas");
  const [companias, setCompanias] = useState<Compania[]>(semilla.companias);
  const [bancos, setBancos] = useState<Banco[]>(semilla.bancos);
  const [facturas, setFacturas] = useState<Factura[]>(semilla.facturas);
  const [pagos, setPagos] = useState<Pago[]>(semilla.pagos);
  const [erogaciones, setErogaciones] = useState<Erogacion[]>(semilla.erogaciones);
  const [documentosPorPagar, setDocumentosPorPagar] = useState<DocumentoPorPagar[]>(
    semilla.documentosPorPagar,
  );
  const [documentosPorCobrar, setDocumentosPorCobrar] = useState<DocumentoPorCobrar[]>(
    semilla.documentosPorCobrar,
  );
  const [contratos, setContratos] = useState<Contrato[]>(semilla.contratos);
  const [pedidos, setPedidos] = useState<Pedido[]>(semilla.pedidos);
  const [tiposCambio, setTiposCambio] = useState<TipoCambio[]>(semilla.tiposCambio);
  const [bitacora, setBitacora] = useState<RegistroBitacora[]>(semilla.bitacoraInicial);
  const [parametros, setParametros] = useState<Record<string, string>>({ ...PARAMETROS_DEFECTO });
  const [preferencias, setPreferencias] = useState<Record<string, string>>({});
  const [avisoFuenteExterna, setAvisoFuenteExterna] = useState<string | null>(null);
  const iniciado = useRef(false);

  const hoy = modoApi ? new Date().toISOString().slice(0, 10) : semilla.FECHA_CORTE;
  const tipoCambio = tiposCambio[tiposCambio.length - 1]?.valor ?? 0;

  const aplicarEstado = useCallback((estado: EstadoServidor) => {
    // El usuario del token trae datos mínimos; si viene la lista completa, se usa ese registro.
    const completo = estado.usuarios?.find((u) => u.id === estado.usuario.id);
    setUsuario(completo ? { ...estado.usuario, ...completo } : estado.usuario);
    setUsuarios(
      estado.usuarios && estado.usuarios.length > 0
        ? estado.usuarios
        : [completo ?? estado.usuario],
    );
    setCompanias(estado.companias);
    setBancos(estado.bancos);
    setFacturas(estado.facturas);
    setPagos(estado.pagos);
    setErogaciones(estado.erogaciones);
    setDocumentosPorPagar(estado.documentosPorPagar ?? []);
    setDocumentosPorCobrar(estado.documentosPorCobrar ?? []);
    setContratos(estado.contratos);
    setPedidos(estado.pedidos);
    setTiposCambio(estado.tiposCambio);
    setBitacora(estado.bitacora);
    setParametros({ ...PARAMETROS_DEFECTO, ...(estado.parametros ?? {}) });
    setPreferencias({ ...(estado.preferencias ?? {}) });
    setAvisoFuenteExterna(estado.avisoFuenteExterna ?? null);
  }, []);

  /** Cierra la sesión y devuelve al inicio de sesión. */
  const forzarLogin = useCallback((mensaje?: string) => {
    guardarToken(null);
    setAutenticado(false);
    setSesionCerrada(false);
    if (mensaje) toast.error(mensaje);
  }, []);

  /**
   * Si la sesión venció o se perdió la conexión con el servidor, se cierra la
   * sesión y se vuelve a pedir el inicio de sesión.
   */
  const sesionExpirada = useCallback(
    (e: unknown): boolean => {
      const estado = e instanceof ErrorApi ? e.estado : null;
      const expiro = estado === 401 || (e instanceof Error && e.message.includes("Sesión"));
      const sinConexion = estado === 0 || estado === 502 || estado === 503 || estado === 504;
      if (!expiro && !sinConexion) return false;
      forzarLogin(
        sinConexion
          ? "Se perdió la conexión con el servidor. Inicie sesión nuevamente."
          : undefined,
      );
      return true;
    },
    [forzarLogin],
  );

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
      sesionExpirada(e);
    } finally {
      setCargando(false);
    }
  }, [aplicarEstado, sesionExpirada]);

  // Arranque: si hay una sesión guardada y sigue vigente, se restaura sin pedir el login.
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    const conApi = hayApi();
    setModoApi(conApi);
    if (conApi && obtenerToken()) {
      void recargar();
      return;
    }
    guardarToken(null);
    setAutenticado(false);
    // Solo debe ejecutarse una vez al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Revalida la sesión al volver a la pestaña: si el token venció, se pide el login otra vez.
  useEffect(() => {
    if (!modoApi || !autenticado) return;
    const alVolver = () => {
      if (document.visibilityState === "visible") void recargar();
    };
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("focus", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [modoApi, autenticado, recargar]);

  // Vigilancia de la conexión: solo se cierra la sesión tras varios fallos seguidos,
  // para que un corte momentáneo no expulse al usuario.
  useEffect(() => {
    if (!modoApi || !autenticado) return;
    let vivo = true;
    let fallos = 0;
    const revisar = async () => {
      try {
        await api<{ estado?: string }>("/salud", { sinToken: true });
        fallos = 0;
      } catch (e) {
        if (!vivo) return;
        const estado = e instanceof ErrorApi ? e.estado : null;
        const caido = estado === 0 || estado === 502 || estado === 503 || estado === 504;
        if (!caido) {
          fallos = 0;
          return;
        }
        fallos += 1;
        if (fallos >= 3)
          forzarLogin("Se perdió la conexión con el servidor. Inicie sesión nuevamente.");
      }
    };
    const id = window.setInterval(() => void revisar(), 20000);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, [modoApi, autenticado, forzarLogin]);


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
  /** Ejecuta el cambio (en la API o localmente) y resuelve `true` solo si se guardó. */
  const mutar = useCallback(
    async (ruta: string, metodo: string, cuerpo: unknown, local: () => void): Promise<boolean> => {
      if (!hayApi()) {
        local();
        return true;
      }
      try {
        await api(ruta, { metodo, cuerpo });
        await recargar();
        return true;
      } catch (e) {
        if (sesionExpirada(e)) {
          toast.error("Su sesión expiró. Inicie sesión nuevamente.");
          return false;
        }
        toast.error(e instanceof Error ? e.message : "No se pudo guardar el cambio");
        return false;
      }
    },
    [recargar, sesionExpirada],
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
    // Con contratos o pedidos de fuente externa no se generan pedidos: la lista
    // visible no refleja la tabla local y la próxima facturación no es editable,
    // lo que provocaba intentos repetidos con números duplicados.
    if (
      parametros[PARAM_CONTRATOS_FUENTE_EXTERNA] === "1" ||
      parametros[PARAM_PEDIDOS_FUENTE_EXTERNA] === "1"
    )
      return;
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
      toast.info(
        pendientes.length === 1
          ? `Se generó 1 pedido a partir de contratos vigentes.`
          : `Se generaron ${pendientes.length} pedidos a partir de contratos vigentes.`,
      );
      return;
    }

    void (async () => {
      let creados = 0;
      let duplicados = 0;
      try {
        for (const g of pendientes) {
          try {
            await api("/pedidos", { metodo: "POST", cuerpo: g.pedido });
            creados++;
          } catch (e) {
            // Si el pedido ya existe en la base (número repetido) se omite en
            // silencio: no es un error, simplemente ya fue generado antes.
            const mensaje = e instanceof Error ? e.message : String(e);
            if (/UNIQUE|duplicate|duplicad/i.test(mensaje)) {
              duplicados++;
              continue;
            }
            throw e;
          }
        }
        for (const [contratoId, proximaFacturacion] of ultimaPorContrato) {
          try {
            await api(`/contratos/${contratoId}`, {
              metodo: "PUT",
              cuerpo: { proximaFacturacion, facturado: false },
            });
          } catch {
            // El contrato puede no ser editable; no interrumpe la generación.
          }
        }
        if (creados > 0 || duplicados > 0) await recargar();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "No se pudieron generar los pedidos de contratos",
        );
      }
      if (creados > 0) {
        toast.info(
          creados === 1
            ? `Se generó 1 pedido a partir de contratos vigentes.`
            : `Se generaron ${creados} pedidos a partir de contratos vigentes.`,
        );
      }
    })();
  }, [anotar, autenticado, cargando, contratos, hoy, parametros, pedidos, recargar]);


  // Contratos activos que deben facturarse en el mes corriente (RF-011).
  // Se calcula igual con datos locales o con origen externo (SoftlandERP),
  // porque los contratos siempre viven en la base del sistema.
  const contratosDelMes = useMemo(() => {
    const documentos = [
      ...pedidos
        .filter((p) => p.estado !== "Anulado")
        .map((p) => ({ numero: p.numero, fecha: p.fechaCreacion })),
      ...facturas.map((f) => ({ numero: f.numero, fecha: f.fechaEmision })),
    ];
    return contratosPorFacturarDelMes(contratos, documentos, hoy.slice(0, 7));
  }, [contratos, pedidos, facturas, hoy]);

  // Histórico de meses cerrados de contratos por facturar.
  const contratosMesHistorico = useMemo<MesHistoricoContratos[]>(() => {
    try {
      const bruto = preferencias[PREF_CONTRATOS_MES_HISTORICO];
      if (!bruto) return [];
      const datos = JSON.parse(bruto) as MesHistoricoContratos[];
      return Array.isArray(datos) ? datos : [];
    } catch {
      return [];
    }
  }, [preferencias]);

  const guardarPreferencia = useCallback((clave: string, valorPref: string) => {
    setPreferencias((prev) => ({ ...prev, [clave]: valorPref }));
    if (hayApi())
      void api(`/preferencias/${encodeURIComponent(clave)}`, {
        metodo: "PUT",
        cuerpo: { valor: valorPref },
      }).catch(() => undefined);
  }, []);

  // Al primer ingreso de cada mes se revisa la lista y se avisa al usuario.
  const mesRevisado = useRef<string | null>(null);
  useEffect(() => {
    if (!autenticado || cargando) return;
    const mes = hoy.slice(0, 7);
    if (mesRevisado.current === mes) return;
    if (preferencias[PREF_CONTRATOS_MES_REVISADO] === mes) {
      mesRevisado.current = mes;
      return;
    }
    const mesAnterior = preferencias[PREF_CONTRATOS_MES_REVISADO];
    mesRevisado.current = mes;

    // Si el parámetro está encendido, el mes anterior se archiva y la lista queda limpia.
    if (parametros[PARAM_CONTRATOS_MES_LIMPIAR] === "1" && mesAnterior && mesAnterior !== mes) {
      let pagados: string[] = [];
      try {
        const bruto = preferencias[PREF_CONTRATOS_MES_PAGADOS];
        if (bruto) pagados = JSON.parse(bruto) as string[];
      } catch {
        pagados = [];
      }
      const documentos = [
        ...pedidos
          .filter((p) => p.estado !== "Anulado")
          .map((p) => ({ numero: p.numero, fecha: p.fechaCreacion })),
        ...facturas.map((f) => ({ numero: f.numero, fecha: f.fechaEmision })),
      ];
      const lineas: LineaHistoricoContrato[] = contratosPorFacturarDelMes(
        contratos,
        documentos,
        mesAnterior,
      ).map((c) => ({
        contratoId: c.contratoId,
        companiaId: c.companiaId,
        numero: c.numero,
        cliente: c.cliente,
        periodicidad: c.periodicidad,
        fecha: c.fecha,
        moneda: c.moneda,
        monto: c.monto,
        pagado: pagados.includes(`${c.contratoId}|${c.fecha}`),
        ...(c.documento ? { documento: c.documento } : {}),
      }));
      if (lineas.length > 0) {
        const historico = [
          { mes: mesAnterior, archivadoEn: hoy, lineas },
          ...contratosMesHistorico.filter((h) => h.mes !== mesAnterior),
        ].slice(0, 24);
        guardarPreferencia(PREF_CONTRATOS_MES_HISTORICO, JSON.stringify(historico));
      }
      // La lista principal conserva solo las marcas del mes corriente.
      guardarPreferencia(
        PREF_CONTRATOS_MES_PAGADOS,
        JSON.stringify(pagados.filter((k) => (k.split("|")[1] ?? "").slice(0, 7) === mes)),
      );
      toast.info(`Los contratos de ${mesAnterior} se archivaron en el histórico.`);
    }

    guardarPreferencia(PREF_CONTRATOS_MES_REVISADO, mes);
    const porFacturar = contratosDelMes.filter((c) => !c.yaDocumentado).length;
    if (porFacturar > 0)
      toast.info(
        porFacturar === 1
          ? "1 contrato debe facturarse este mes. Vea Contratos por facturar del mes."
          : `${porFacturar} contratos deben facturarse este mes. Vea Contratos por facturar del mes.`,
      );
  }, [
    autenticado,
    cargando,
    hoy,
    preferencias,
    parametros,
    contratos,
    pedidos,
    facturas,
    contratosDelMes,
    contratosMesHistorico,
    guardarPreferencia,
  ]);

  const valor = useMemo<EstadoApp>(() => {
    const puedeEditar = usuario.perfil !== "consulta";
    const esAdministrador = usuario.perfil === "administrador";

    return {
      hoy,
      usuario,
      usuarios,
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
      documentosPorPagar,
      documentosPorCobrar,
      contratos,
      pedidos,
      tiposCambio,
      tipoCambio,
      bitacora,
      parametros,
      preferencias,
      actualizarPreferencia: (clave, nuevoValor) => {
        setPreferencias((prev) => ({ ...prev, [clave]: nuevoValor }));
        if (hayApi())
          void api(`/preferencias/${encodeURIComponent(clave)}`, {
            metodo: "PUT",
            cuerpo: { valor: nuevoValor },
          }).catch(() => undefined);
      },
      contratosDelMes,
      contratosMesHistorico,
      contratosMesLimpiar: parametros[PARAM_CONTRATOS_MES_LIMPIAR] === "1",
      pedidosFuenteExterna: parametros[PARAM_PEDIDOS_FUENTE_EXTERNA] === "1",
      facturasFuenteExterna: parametros[PARAM_FACTURAS_FUENTE_EXTERNA] === "1",
      documentosPagoFuenteExterna: parametros[PARAM_DOCUMENTOS_PAGO_FUENTE_EXTERNA] === "1",
      documentosCobroFuenteExterna: parametros[PARAM_DOCUMENTOS_COBRO_FUENTE_EXTERNA] === "1",
      contratosFuenteExterna: parametros[PARAM_CONTRATOS_FUENTE_EXTERNA] === "1",
      pedidosFuenteOrigen: parametros[PARAM_PEDIDOS_FUENTE_ORIGEN] || FUENTE_PEDIDOS_DEFECTO,
      avisoFuenteExterna,
      actualizarParametro: (clave, nuevoValor) =>
        mutar(`/parametros/${encodeURIComponent(clave)}`, "PUT", { valor: nuevoValor }, () => {
          const anterior = parametros[clave];
          setParametros((prev) => ({ ...prev, [clave]: nuevoValor }));
          anotar("Parámetros", clave, "Modificación", nuevoValor, anterior);
        }),
      facturasCalculadas,
      puedeEditar,
      esAdministrador,
      autenticar,
      entrarDemostracion: () => {
        guardarToken(null);
        setModoApi(false);
        setUsuario(semilla.usuarios[0]!);
        setUsuarios(semilla.usuarios);
        setAutenticado(true);
        setSesionCerrada(false);
      },
      recargar,

      iniciarSesion: (usuarioId) => {
        const u = semilla.usuarios.find((x) => x.id === usuarioId);
        if (u) setUsuario(u);
        setAutenticado(true);
      },
      cerrarSesion: () => {
        guardarToken(null);
        setModoApi(hayApi());
        setAutenticado(false);
        setSesionCerrada(true);
      },
      volverAlLogin: () => setSesionCerrada(false),

      cambiarUsuario: (usuarioId) => {
        const u = usuarios.find((x) => x.id === usuarioId);
        if (u) setUsuario(u);
      },
      crearUsuario: async (datos) => {
        if (hayApi()) {
          await api("/usuarios", { metodo: "POST", cuerpo: datos });
          await recargar();
          return;
        }
        if (usuarios.some((u) => u.nombreUsuario === datos.nombreUsuario))
          throw new Error("Ya existe un usuario con ese nombre de inicio de sesión.");
        const nuevo: Usuario = {
          id: nuevoId("us"),
          nombre: datos.nombre,
          perfil: datos.perfil,
          nombreUsuario: datos.nombreUsuario,
          correo: datos.correo,
          activo: datos.activo,
          verBancos: datos.verBancos ?? true,
          verConsolidado: datos.verConsolidado ?? true,
          verErogaciones: datos.verErogaciones ?? true,
          verProyeccion: datos.verProyeccion ?? true,
          verCatalogos: datos.verCatalogos ?? true,
          editarErogaciones: datos.editarErogaciones ?? true,
        };
        setUsuarios((prev) => [...prev, nuevo]);
        anotar("Seguridad", datos.nombreUsuario, "Creación", `Perfil: ${datos.perfil}`);
      },
      actualizarUsuario: async (id, cambios) => {
        if (hayApi()) {
          await api(`/usuarios/${id}`, { metodo: "PUT", cuerpo: cambios });
          await recargar();
          return;
        }
        const anterior = usuarios.find((u) => u.id === id);
        const visibilidad = {
          ...(cambios.verBancos !== undefined ? { verBancos: cambios.verBancos } : {}),
          ...(cambios.verConsolidado !== undefined
            ? { verConsolidado: cambios.verConsolidado }
            : {}),
          ...(cambios.verErogaciones !== undefined
            ? { verErogaciones: cambios.verErogaciones }
            : {}),
          ...(cambios.verProyeccion !== undefined ? { verProyeccion: cambios.verProyeccion } : {}),
          ...(cambios.verCatalogos !== undefined ? { verCatalogos: cambios.verCatalogos } : {}),
          ...(cambios.editarErogaciones !== undefined
            ? { editarErogaciones: cambios.editarErogaciones }
            : {}),
        };
        setUsuarios((prev) =>
          prev.map((u) =>
            u.id === id
              ? {
                  ...u,
                  ...(cambios.nombre !== undefined ? { nombre: cambios.nombre } : {}),
                  ...(cambios.nombreUsuario !== undefined
                    ? { nombreUsuario: cambios.nombreUsuario }
                    : {}),
                  ...(cambios.correo !== undefined ? { correo: cambios.correo } : {}),
                  ...(cambios.perfil !== undefined ? { perfil: cambios.perfil } : {}),
                  ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}),
                  ...visibilidad,
                }
              : u,
          ),
        );
        if (anterior?.id === usuario.id)
          setUsuario((u) => ({
            ...u,
            ...(cambios.perfil ? { perfil: cambios.perfil } : {}),
            ...visibilidad,
          }));
        anotar(
          "Seguridad",
          anterior?.nombreUsuario ?? anterior?.nombre ?? id,
          "Modificación",
          JSON.stringify({ ...cambios, contrasena: undefined }),
        );
      },
      eliminarUsuario: async (id) => {
        if (hayApi()) {
          await api(`/usuarios/${id}`, { metodo: "DELETE" });
          await recargar();
          return;
        }
        const u = usuarios.find((x) => x.id === id);
        if (!u) return;
        if (u.id === usuario.id) throw new Error("No puede eliminar el usuario de la sesión activa.");
        const referencias =
          tiposCambio.filter((t) => t.usuario === u.nombre).length +
          bitacora.filter((b) => b.usuario === u.nombre).length;
        if (referencias > 0)
          throw new Error(
            "No se puede eliminar: el usuario tiene movimientos registrados. Inactívelo en su lugar.",
          );
        setUsuarios((prev) => prev.filter((x) => x.id !== id));
        anotar("Seguridad", u.nombreUsuario ?? u.nombre, "Eliminación");
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
          // Si la erogación se aplica a un documento por pagar interno, baja su saldo.
          if (e.documentoPagoId)
            setDocumentosPorPagar((prev) =>
              prev.map((d) =>
                d.id === e.documentoPagoId
                  ? { ...d, saldo: Math.max(0, Number((d.saldo - e.monto).toFixed(2))) }
                  : d,
              ),
            );
          anotar("Erogaciones", e.numeroTransferencia, "Creación", `Monto: ${e.monto}`);
        }),
      actualizarErogacion: (id, cambios) =>
        mutar(`/erogaciones/${id}`, "PUT", cambios, () => {
          const anterior = erogaciones.find((x) => x.id === id);
          setErogaciones((prev) => prev.map((e) => (e.id === id ? { ...e, ...cambios } : e)));
          if (anterior?.documentoPagoId)
            setDocumentosPorPagar((prev) =>
              prev.map((d) =>
                d.id === anterior.documentoPagoId
                  ? { ...d, saldo: Math.min(d.monto, Number((d.saldo + anterior.monto).toFixed(2))) }
                  : d,
              ),
            );
          if (cambios.documentoPagoId)
            setDocumentosPorPagar((prev) =>
              prev.map((d) =>
                d.id === cambios.documentoPagoId
                  ? { ...d, saldo: Math.max(0, Number((d.saldo - cambios.monto).toFixed(2))) }
                  : d,
              ),
            );
          if (anterior)
            anotar(
              "Erogaciones",
              cambios.numeroTransferencia,
              "Modificación",
              JSON.stringify(cambios),
              JSON.stringify(anterior),
            );
        }),
      agregarDocumentoPorPagar: (d) =>
        mutar("/documentos-pagar", "POST", d, () => {
          setDocumentosPorPagar((prev) => [{ ...d, id: nuevoId("dp") }, ...prev]);
          anotar("Documentos por pagar", d.numero, "Creación", `${d.moneda} ${d.monto}`);
        }),
      actualizarDocumentoPorPagar: (id, cambios) =>
        mutar(`/documentos-pagar/${id}`, "PUT", cambios, () => {
          setDocumentosPorPagar((prev) =>
            prev.map((d) => (d.id === id ? { ...d, ...cambios } : d)),
          );
          const d = documentosPorPagar.find((x) => x.id === id);
          if (d)
            anotar("Documentos por pagar", d.numero, "Modificación", JSON.stringify(cambios));
        }),
      agregarDocumentoPorCobrar: (d) =>
        mutar("/documentos-cobrar", "POST", d, () => {
          setDocumentosPorCobrar((prev) => [{ ...d, id: nuevoId("dc") }, ...prev]);
          anotar("Documentos por cobrar", d.numero, "Creación", `${d.moneda} ${d.monto}`);
        }),
      actualizarDocumentoPorCobrar: (id, cambios) =>
        mutar(`/documentos-cobrar/${id}`, "PUT", cambios, () => {
          setDocumentosPorCobrar((prev) =>
            prev.map((d) => (d.id === id ? { ...d, ...cambios } : d)),
          );
          const d = documentosPorCobrar.find((x) => x.id === id);
          if (d) anotar("Documentos por cobrar", d.numero, "Modificación", JSON.stringify(cambios));
        }),
      eliminarDocumentoPorCobrar: (id) =>
        mutar(`/documentos-cobrar/${id}`, "DELETE", undefined, () => {
          const d = documentosPorCobrar.find((x) => x.id === id);
          setDocumentosPorCobrar((prev) => prev.filter((x) => x.id !== id));
          if (d) anotar("Documentos por cobrar", d.numero, "Eliminación");
        }),
      eliminarDocumentoPorPagar: (id) =>
        mutar(`/documentos-pagar/${id}`, "DELETE", undefined, () => {
          const d = documentosPorPagar.find((x) => x.id === id);
          setDocumentosPorPagar((prev) => prev.filter((x) => x.id !== id));
          if (d) anotar("Documentos por pagar", d.numero, "Eliminación");
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
        setDocumentosPorPagar(semilla.documentosPorPagar);
        setDocumentosPorCobrar(semilla.documentosPorCobrar);
        setContratos(semilla.contratos);
        setPedidos(semilla.pedidos);
        setTiposCambio(semilla.tiposCambio);
        setBitacora(semilla.bitacoraInicial);
        setUsuarios(semilla.usuarios);
      },
    };
  }, [
    anotar,
    autenticar,
    autenticado,
    avisoFuenteExterna,
    sesionCerrada,
    bancos,
    bitacora,
    cargando,
    companiaActiva,
    companias,
    contratos,
    erogaciones,
    documentosPorPagar,
    documentosPorCobrar,
    errorApi,
    facturas,
    facturasCalculadas,
    hoy,
    modoApi,
    mutar,
    pagos,
    parametros,
    preferencias,
    contratosDelMes,
    contratosMesHistorico,
    pedidos,
    recargar,
    tipoCambio,
    tiposCambio,
    usuario,
    usuarios,
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
