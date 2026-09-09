# Filas visibles por tabla (parámetro por usuario) — v1.19.10

Sí es posible. Se agrega un parámetro "Filas visibles" con opciones 10, 20, 50 y 100, guardado por usuario, que define la altura de todas las tablas del sistema; el resto de registros se sigue viendo con el scroll y el encabezado fijo se mantiene.

## Qué verá el usuario

- En Parámetros: un nuevo campo tipo lista "Filas visibles en tablas" con 10 / 20 / 50 / 100. Es el valor global de esa persona.
- En cada pantalla con tabla (Pedidos, Facturas, Pagos recibidos, Erogaciones, Contratos recurrentes, Contratos por facturar este mes, Bitácora y Bancos): un selector pequeño sobre la tabla, junto a los filtros, para cambiar el valor puntualmente en esa pantalla.
- El cambio hecho en Parámetros aplica de inmediato a todas las tablas; el cambio hecho en una pantalla se recuerda para esa pantalla del mismo usuario.
- El valor por defecto será 20.
- Los cambios del valor global quedan registrados en la bitácora, igual que los demás parámetros.

## Detalle técnico

1. Preferencia global
   - Nuevo parámetro `FilasVisibles` en la tabla de parámetros existente, con auditoría (mismo flujo que tipo de cambio). Script idempotente `database/08_parametro_filas.sql` más auto-migración en `Program.cs`.
   - Endpoints existentes de parámetros: se agrega lectura/escritura del valor, validando que sea 10, 20, 50 o 100.
   - En modo demostración (sin SQL Server) el valor se guarda localmente por usuario.

2. Preferencias por pantalla
   - Se guardan por usuario y pantalla con clave `flujo.filas.<usuario>.<pantalla>` en el almacenamiento del navegador; si no existe, se usa el valor global.

3. Consumo en la interfaz
   - Nuevo hook `useFilasVisibles(pantalla)` en `src/lib/preferencias.ts`, que devuelve el número efectivo y el setter.
   - Nuevo componente `SelectorFilas` reutilizable.
   - Cada tabla reemplaza su altura fija (`max-h-[60vh]`, `max-h-[46rem]`, `max-h-[26rem]`) por una altura calculada: alto de encabezado + filas × alto de fila, vía estilo en línea, conservando `overflow-auto` y los encabezados `sticky` actuales.

4. Versión
   - `src/lib/version.ts` sube a 1.19.10 con la entrada de historial correspondiente.
   - Verificación con `bunx tsgo --noEmit`.
