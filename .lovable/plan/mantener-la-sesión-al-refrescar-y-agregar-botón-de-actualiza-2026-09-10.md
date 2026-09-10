# Mantener la sesión al refrescar y agregar botón de actualizar (v1.20.6)

## Qué está pasando hoy

Al arrancar, la aplicación borra a propósito la sesión guardada y vuelve a pedir el inicio de sesión.
Por eso cualquier "refrescar" del navegador (F5) manda al login, aunque la sesión siga vigente
(el acceso dura 8 horas). Además, hoy no existe ningún botón de actualizar dentro de las pantallas,
así que para ver datos nuevos del origen externo el usuario solo puede refrescar el navegador.

## Solución propuesta (las dos partes, ambas pequeñas)

### 1. Conservar la sesión al refrescar
- Al abrir la aplicación, si hay una sesión guardada y aún es válida, se restaura automáticamente
  y se cargan los datos, sin pasar por la pantalla de inicio de sesión.
- Si la sesión ya venció o el servidor la rechaza, entonces sí se muestra el inicio de sesión
  (comportamiento actual, sin cambios).
- La vigilancia de conexión se ajusta para que un corte momentáneo no borre la sesión: se reintenta
  antes de cerrarla, de modo que una caída pasajera no expulse al usuario.
- El cierre de sesión explícito sigue igual: borra la sesión y lleva a la pantalla de sesión cerrada.

### 2. Botón "Actualizar" dentro de las pantallas
- Se agrega un botón de actualizar en **Pedidos**, **Facturas por cobrar** y **Documentos por pagar**.
- Vuelve a leer los datos del origen (incluido el externo) sin recargar la página ni tocar la sesión.
- Muestra un indicador mientras carga y avisa si el origen externo falla.

## Detalle técnico

- `src/contexto/AppContexto.tsx`: en el efecto de arranque, en lugar de `guardarToken(null)`,
  si `hayApi()` y existe token se llama `recargar()`; el éxito de `/estado` marca `autenticado`.
  Si devuelve 401 se limpia el token y se muestra el login.
- Mismo archivo: en el intervalo de vigilancia de `/salud`, exigir dos fallos consecutivos antes
  de llamar `forzarLogin`, y no cerrar sesión por el evento `offline` inmediato.
- `src/routes/pedidos.tsx`, `src/routes/facturas.tsx`, `src/routes/documentos-pagar.tsx`:
  botón junto a los filtros que invoca `recargar()` del contexto, deshabilitado mientras `cargando`.
- `src/lib/version.ts`: subir a `1.20.6` con la entrada de historial.
- Verificación: `bunx tsgo --noEmit`.
