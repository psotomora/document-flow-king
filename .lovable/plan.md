# Filtros en Pedidos pendientes

## Objetivo
Agregar en la pantalla **Pedidos pendientes** filtros para buscar por número de pedido o nombre de cliente, y un rango de fechas (inicio y fin) sobre la fecha de creación.

## Alcance
Solo cambios en el frontend; la lista ya se carga completa en memoria, por lo que los filtros se aplican del lado del cliente.

## Cambios planificados

1. **Estado local en `src/routes/pedidos.tsx`**
   - Agregar `busqueda: string`.
   - Agregar `fechaInicio: string` y `fechaFin: string`.

2. **Lógica de filtrado**
   - Después del filtro por compañía y estado, aplicar:
     - Búsqueda por coincidencia parcial en `numero` o `cliente` (sin distinguir mayúsculas/minúsculas).
     - Rango de fechas: incluir pedidos cuya `fechaCreacion` sea mayor o igual a `fechaInicio` y menor o igual a `fechaFin`, cuando ambos o alguno de los campos tenga valor.
   - Los totales y la exportación a Excel deben respetar la lista filtrada (ya usan `filtrados`).

3. **Controles de interfaz**
   - En la barra de filtros existente, agregar:
     - Campo de texto con etiqueta **Buscar** y placeholder "Número o cliente…".
     - Dos campos de tipo fecha con etiquetas **Fecha inicio** y **Fecha fin**.
   - Mantener el diseño responsive actual (`flex flex-wrap items-end gap-3`).

4. **Versión**
   - Subir a `1.19.5` en `src/lib/version.ts` y agregar la entrada correspondiente al historial.

5. **Validación**
   - Ejecutar `bunx tsgo --noEmit` para confirmar que no hay errores de tipo.

## Fuera de alcance
- No se modifica la API ni la base de datos.
- No se persisten los filtros en URL ni en almacenamiento.
