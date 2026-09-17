/**
 * Consola de Aplix: alta y mantenimiento de las empresas (clientes) del modo
 * SaaS. Solo el perfil superadmin puede consumir estos servicios; ningún
 * usuario de una empresa tiene acceso a esta información.
 */
import { api } from "@/lib/api";

export interface ClienteSaaS {
  id: number;
  codigo: string;
  nombre: string;
  servidor: string;
  baseDatos: string;
  usuario: string;
  encriptar: boolean;
  activo: boolean;
}

export interface DatosCliente {
  codigo: string;
  nombre: string;
  servidor: string;
  baseDatos: string;
  usuario?: string;
  clave?: string;
  encriptar: boolean;
  activo: boolean;
}

export function listarClientes() {
  return api<ClienteSaaS[]>("/admin/clientes");
}

export function crearCliente(datos: DatosCliente) {
  return api<{ id: number }>("/admin/clientes", { metodo: "POST", cuerpo: datos });
}

export function actualizarCliente(id: number, datos: DatosCliente) {
  return api<{ mensaje: string }>(`/admin/clientes/${id}`, { metodo: "PUT", cuerpo: datos });
}

export function probarCliente(id: number) {
  return api<{ estado: string; mensaje: string }>(`/admin/clientes/${id}/probar`, {
    metodo: "POST",
  });
}

export function aprovisionarCliente(id: number) {
  return api<{ mensaje: string; scripts: string[] }>(`/admin/clientes/${id}/aprovisionar`, {
    metodo: "POST",
  });
}
