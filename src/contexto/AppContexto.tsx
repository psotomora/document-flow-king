import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as semilla from "@/data/semilla";
import type {
  Banco,
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

let contador = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${Date.now().toString(36)}-${contador++}`;

interface EstadoApp {
  hoy: string;
  usuario: Usuario;
  perfil: Perfil;
  autenticado: boolean;
  companiaActiva: string | "todas";
  companias: typeof semilla.companias;
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
  cerrarSesion: () => void;
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
  registrarTipoCambio: (valor: number) => void;
  importarLote: (datos: {
    facturas?: Omit<Factura, "id">[];
    pagos?: Omit<Pago, "id">[];
    erogaciones?: Omit<Erogacion, "id">[];
  }) => void;
  reiniciar: () => void;
}

const Contexto = createContext<EstadoApp | null>(null);

export function ProveedorApp({ children }: { children: ReactNode }) {
  const [autenticado, setAutenticado] = useState(true);
  const [usuario, setUsuario] = useState<Usuario>(semilla.usuarios[0]!);
  const [companiaActiva, setCompaniaActiva] = useState<string | "todas">("todas");
  const [bancos, setBancos] = useState<Banco[]>(semilla.bancos);
  const [facturas, setFacturas] = useState<Factura[]>(semilla.facturas);
  const [pagos, setPagos] = useState<Pago[]>(semilla.pagos);
  const [erogaciones, setErogaciones] = useState<Erogacion[]>(semilla.erogaciones);
  const [contratos, setContratos] = useState<Contrato[]>(semilla.contratos);
  const [pedidos, setPedidos] = useState<Pedido[]>(semilla.pedidos);
  const [tiposCambio, setTiposCambio] = useState<TipoCambio[]>(semilla.tiposCambio);
  const [bitacora, setBitacora] = useState<RegistroBitacora[]>(semilla.bitacoraInicial);

  const hoy = semilla.FECHA_CORTE;
  const tipoCambio = tiposCambio[tiposCambio.length - 1]?.valor ?? 0;

  const anotar = useCallback(
    (
      modulo: string,
      registro: string,
      operacion: OperacionBitacora,
      valorNuevo?: string,
      valorAnterior?: string,
    ) => {
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

  const valor = useMemo<EstadoApp>(() => {
    const puedeEditar = usuario.perfil !== "consulta";
    const esAdministrador = usuario.perfil === "administrador";

    return {
      hoy,
      usuario,
      perfil: usuario.perfil,
      autenticado,
      companiaActiva,
      companias: semilla.companias,
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
      iniciarSesion: (usuarioId) => {
        const u = semilla.usuarios.find((x) => x.id === usuarioId);
        if (u) setUsuario(u);
        setAutenticado(true);
      },
      cerrarSesion: () => setAutenticado(false),
      cambiarUsuario: (usuarioId) => {
        const u = semilla.usuarios.find((x) => x.id === usuarioId);
        if (u) setUsuario(u);
      },
      setCompaniaActiva,
      agregarFactura: (f) => {
        const id = nuevoId("f");
        setFacturas((prev) => [{ ...f, id }, ...prev]);
        anotar("Facturas", f.numero, "Creación", `Monto: ${f.monto}`);
      },
      eliminarFactura: (id) => {
        const f = facturas.find((x) => x.id === id);
        setFacturas((prev) => prev.filter((x) => x.id !== id));
        setPagos((prev) => prev.filter((p) => p.facturaId !== id));
        if (f) anotar("Facturas", f.numero, "Eliminación", undefined, `Monto: ${f.monto}`);
      },
      agregarPago: (p) => {
        setPagos((prev) => [{ ...p, id: nuevoId("p") }, ...prev]);
        anotar("Pagos", p.referencia ?? "Pago", "Creación", `Monto: ${p.monto}`);
      },
      eliminarPago: (id) => {
        const p = pagos.find((x) => x.id === id);
        setPagos((prev) => prev.filter((x) => x.id !== id));
        if (p) anotar("Pagos", p.referencia ?? "Pago", "Eliminación", undefined, `Monto: ${p.monto}`);
      },
      agregarErogacion: (e) => {
        setErogaciones((prev) => [{ ...e, id: nuevoId("e") }, ...prev]);
        anotar("Erogaciones", e.numeroTransferencia, "Creación", `Monto: ${e.monto}`);
      },
      eliminarErogacion: (id) => {
        const e = erogaciones.find((x) => x.id === id);
        setErogaciones((prev) => prev.filter((x) => x.id !== id));
        if (e)
          anotar("Erogaciones", e.numeroTransferencia, "Eliminación", undefined, `Monto: ${e.monto}`);
      },
      agregarContrato: (c) => {
        setContratos((prev) => [{ ...c, id: nuevoId("c") }, ...prev]);
        anotar("Contratos", c.numero, "Creación", `Monto: ${c.monto}`);
      },
      actualizarContrato: (id, cambios) => {
        setContratos((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
        const c = contratos.find((x) => x.id === id);
        if (c) anotar("Contratos", c.numero, "Modificación", JSON.stringify(cambios));
      },
      eliminarContrato: (id) => {
        const c = contratos.find((x) => x.id === id);
        setContratos((prev) => prev.filter((x) => x.id !== id));
        if (c) anotar("Contratos", c.numero, "Eliminación");
      },
      agregarPedido: (p) => {
        setPedidos((prev) => [{ ...p, id: nuevoId("pd") }, ...prev]);
        anotar("Pedidos", p.numero, "Creación", `Monto: ${p.monto}`);
      },
      actualizarPedido: (id, cambios) => {
        setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
        const p = pedidos.find((x) => x.id === id);
        if (p) anotar("Pedidos", p.numero, "Modificación", JSON.stringify(cambios));
      },
      eliminarPedido: (id) => {
        const p = pedidos.find((x) => x.id === id);
        setPedidos((prev) => prev.filter((x) => x.id !== id));
        if (p) anotar("Pedidos", p.numero, "Eliminación");
      },
      agregarBanco: (b) => {
        setBancos((prev) => [...prev, { ...b, id: nuevoId("bk") }]);
        anotar("Catálogos", b.nombre, "Creación");
      },
      actualizarBanco: (id, cambios) => {
        setBancos((prev) => prev.map((b) => (b.id === id ? { ...b, ...cambios } : b)));
        const b = bancos.find((x) => x.id === id);
        if (b) anotar("Catálogos", b.nombre, "Modificación", JSON.stringify(cambios));
      },
      registrarTipoCambio: (nuevoValor) => {
        const anterior = tipoCambio;
        setTiposCambio((prev) => [
          ...prev,
          {
            id: nuevoId("tc"),
            valor: nuevoValor,
            fecha: `${hoy}T${new Date().toISOString().slice(11, 16)}`,
            usuario: usuario.nombre,
          },
        ]);
        anotar(
          "Parámetros",
          "Tipo de cambio",
          "Modificación",
          String(nuevoValor),
          String(anterior),
        );
      },
      importarLote: (datos) => {
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
      },
      reiniciar: () => {
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
    autenticado,
    bancos,
    bitacora,
    companiaActiva,
    contratos,
    erogaciones,
    facturas,
    facturasCalculadas,
    hoy,
    pagos,
    pedidos,
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
