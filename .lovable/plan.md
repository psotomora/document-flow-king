# Subparámetro: fuente de los pedidos externos

## Qué se va a construir

En la sección **Parámetros**, debajo del interruptor "Usar datos de pedidos de fuente externa", aparecerá un nuevo campo dependiente:

- **Fuente de pedidos**: una lista desplegable con la opción **SoftlandERP** (única por ahora, preparada para agregar más fuentes después).
- Solo se muestra/habilita cuando el interruptor está en **Sí**. Si está en **No**, el campo queda deshabilitado y atenuado.
- Al activar el interruptor por primera vez, se preselecciona **SoftlandERP** automáticamente para que no quede vacío.
- Solo el administrador puede cambiarlo; se guarda en la **base de datos** y cada cambio queda en la **bitácora**, igual que el interruptor.
- En modo demo (sin API) se comporta igual, pero el valor solo vive en la sesión.

```text
Integración
  Usar datos de pedidos de fuente externa        [Sí] (o)
     └─ Fuente de pedidos                        [ SoftlandERP ▾ ]
```

## Detalles técnicos

1. **Base de datos / API**
   - Nuevo parámetro `pedidosFuenteOrigen` en `flujo.Parametro` (valor por defecto `SoftlandERP`).
   - Agregar el `INSERT` idempotente en la auto-migración de `api/FlujoEfectivo.Api/Program.cs` y en `database/06_parametros_generales.sql`.
   - No hace falta un endpoint nuevo: se reutiliza `PUT /parametros/{clave}` (solo administrador, con auditoría) y `GET /api/estado` que ya devuelve todos los parámetros.

2. **Frontend**
   - `src/contexto/AppContexto.tsx`: exportar `PARAM_PEDIDOS_FUENTE_ORIGEN`, agregar valor por defecto en el estado inicial y exponer `pedidosFuenteOrigen: string` en el contexto.
   - `src/routes/parametros.tsx`: bajo el interruptor, un `Select` (shadcn) con la opción `SoftlandERP`, deshabilitado cuando `!pedidosFuenteExterna || !esAdministrador`; al encender el interruptor sin fuente definida, se guarda `SoftlandERP`.
   - Lista de fuentes centralizada en una constante (`FUENTES_PEDIDOS = [{ valor: "SoftlandERP", etiqueta: "SoftlandERP" }]`) para ampliar después.

3. **Versión y documentación**
   - Subir a **1.11.0** en `src/lib/version.ts` con la nota del cambio.
   - Mencionar el nuevo parámetro en `docs/API-SQLSERVER.md`.

Al terminar: `git pull`, reiniciar la API con `dotnet run` (crea el parámetro automáticamente) y `npm run dev`.
