# Licenciamiento — Instructivo interno

Uso exclusivo del equipo de Aplix / Theronix, S. A.
Aplica a Aplix Cash Flow Insights y a las demás aplicaciones que usen el mismo esquema de licencias.

---

## 1. Cómo funciona (resumen)

- El **servidor propio** (interno de Aplix) es el **emisor**: guarda la llave privada y genera archivos `.lic` firmados.
- El **servidor del cliente** solo guarda la **llave pública**: verifica la firma del `.lic`, pero no puede emitir licencias.
- Cada licencia controla: cliente, producto, fecha de vencimiento, compañías permitidas, cantidad de usuarios activos, huella del equipo y días de gracia.
- Al vencer y agotarse la gracia, la API responde bloqueo (HTTP 402) y la aplicación deja de operar hasta cargar una licencia nueva.

**Regla de oro:** la llave privada nunca sale del servidor propio ni se envía por correo, chat o repositorio.

---

## 2. Configuración del SERVIDOR PROPIO (emisor, una sola vez)

1. Ingrese a la aplicación interna como **administrador**.
2. Vaya a **Parámetros** y deje **apagado** el interruptor “Instalación en equipo del cliente”.
3. Abra **Administración → Licencias** (la entrada solo aparece con el interruptor apagado).
4. Pulse el botón de **generar llaves**. Copie las dos llaves que aparecen:
   - Llave **privada** → solo para este servidor; guárdela también en el gestor de contraseñas de la empresa.
   - Llave **pública** → se repartirá a todos los clientes.
5. En el servidor, edite la configuración de la API publicada
   (`appsettings.Production.json`; en desarrollo `api/FlujoEfectivo.Api/appsettings.json`):

```json
"Licencia": {
  "LlavePublica": "PEGUE-AQUI-LA-PUBLICA",
  "LlavePrivada": "PEGUE-AQUI-LA-PRIVADA",
  "Emisor": "true"
}
```

> **Formato de las llaves (1.36.7).** El generador entrega cada llave en **una sola línea**.
> Péguela completa entre comillas, sin saltos de línea y sin las líneas `-----BEGIN ...-----`.
> La API también acepta el formato antiguo con encabezados, pero en JSON los saltos de línea
> rompen el archivo y la API no inicia (error 500.30). Use el botón **Copiar** de la pantalla de Licencias.

6. Reinicie la API (servicio NSSM o el grupo de aplicaciones en IIS).
7. Vuelva a **Licencias**: el mensaje “Este servidor no está configurado como emisor” debe desaparecer.

> Respaldo: si se pierde la llave privada, **ninguna** licencia futura será válida para los clientes ya instalados
> (habría que reinstalar la llave pública nueva en cada uno). Guarde el respaldo antes de continuar.

---

## 3. Configuración del SERVIDOR DEL CLIENTE (cada instalación)

1. Publique la aplicación y la API siguiendo `docs/DESPLIEGUE-IIS.md`.
2. En la configuración de la API del cliente coloque **solo** la llave pública:

```json
"Licencia": {
  "LlavePublica": "PEGUE-AQUI-LA-PUBLICA",
  "LlavePrivada": "",
  "Emisor": "false"
}
```

3. Reinicie la API.
4. Ingrese como administrador a **Parámetros** y **encienda** “Instalación en equipo del cliente”.
   Con esto la opción Licencias desaparece del menú y no se puede emitir desde el cliente.
5. En la tarjeta **Licencia del sistema** (Parámetros), copie el valor de **Huella de este servidor**
   y envíelo a Aplix. Ese dato amarra la licencia a ese equipo.
6. Deje el interruptor **“Exigir licencia”** apagado hasta que la licencia esté cargada y verificada.

---

## 4. Emitir una licencia (en el servidor propio)

1. **Administración → Licencias**.
2. Complete:
   - **Cliente** y **Código de cliente** (ej.: Theronix, S. A. / THERONIX).
   - **Producto** (por omisión `FlujoEfectivo`; use otro nombre para otras aplicaciones).
   - **Vence**: fecha de fin del contrato.
   - **Huella del servidor del cliente**: la que envió el cliente en el paso 3.5.
     Si se deja vacía, la licencia sirve en cualquier equipo (úselo solo para pruebas).
   - **Compañías permitidas**: separadas por coma; vacío = todas.
   - **Usuarios activos permitidos**: 0 o vacío = sin límite.
   - **Días de gracia**: normalmente 15.
   - **Notas**: número de contrato u orden de compra.
3. Pulse **Emitir**. La licencia queda en el historial y se descarga el archivo `.lic`.
4. Envíe el `.lic` al cliente (correo o canal habitual). El archivo no contiene secretos:
   está firmado y solo funciona en el equipo indicado.

---

## 5. Cargar la licencia en el cliente

1. Administrador → **Parámetros** → tarjeta **Licencia del sistema**.
2. **Cargar archivo** y seleccione el `.lic`.
3. Verifique que el estado quede **Vigente**, con el cliente, la fecha de vencimiento,
   las compañías y el límite de usuarios correctos.
4. Encienda el interruptor **Exigir licencia**.
5. Cierre sesión y vuelva a entrar para confirmar que todo opera normal.

---

## 6. Renovación

1. El cliente ve avisos en pantalla desde 30 días antes del vencimiento.
2. Emita una licencia nueva con la misma huella y la nueva fecha de vencimiento.
3. El cliente la carga igual que en el paso 5; reemplaza a la anterior sin reiniciar nada.
4. Si el vencimiento ya ocurrió, quedan los **días de gracia** para operar; agotados, el sistema se bloquea
   y solo permite iniciar sesión y cargar la licencia.

---

## 7. Estados que puede ver el cliente

| Estado | Significado | Acción |
|---|---|---|
| Vigente | Todo correcto | Ninguna |
| Por vencer | Faltan menos de 30 días | Gestionar renovación |
| En periodo de gracia | Ya venció, aún opera | Renovar de inmediato |
| Bloqueada | Venció y se agotó la gracia | Cargar licencia nueva |
| Sin licencia | No se ha cargado ningún `.lic` | Cargar licencia |
| Licenciamiento desactivado | El interruptor “Exigir licencia” está apagado | Encenderlo tras cargar |

---

## 8. Problemas frecuentes

- **“Este servidor no está configurado como emisor.”** Falta `Licencia:LlavePrivada` o `Licencia:Emisor` no está en `true`, o no se reinició la API. Ver sección 2.
- **“La licencia no corresponde a este servidor.”** La huella cambió (equipo nuevo, cambio de nombre o de hardware). Pida la huella actual y reemita.
- **“Firma inválida.”** La llave pública del cliente no corresponde al par usado para emitir. Reinstale la llave pública correcta.
- **“Se alcanzó el máximo de usuarios.”** Inactive usuarios o emita una licencia con más usuarios.
- **Opción Licencias no aparece.** El interruptor “Instalación en equipo del cliente” está encendido, o el usuario no es administrador.

---

## 9. Lista de verificación por instalación

- [ ] Llave pública instalada en el cliente
- [ ] `Emisor` en `false` y llave privada vacía en el cliente
- [ ] Interruptor “Instalación en equipo del cliente” encendido
- [ ] Huella registrada en el expediente del cliente
- [ ] Licencia emitida y archivada en el historial interno
- [ ] Licencia cargada y estado Vigente
- [ ] Interruptor “Exigir licencia” encendido
- [ ] Fecha de vencimiento anotada en el calendario de renovaciones
