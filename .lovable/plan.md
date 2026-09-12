# Contratos mensuales: pagados fuera de la proyección y botón Trasladar

## 1. Los contratos marcados como pagados sí afectan hoy la proyección

Confirmado en el código: la pantalla de contratos ya excluye los pagados de sus tarjetas, pero
el Saldo proyectado (Inicio y Consolidado) suma "Contratos por facturar este mes" usando solo
el criterio "aún no tiene pedido ni factura". Las marcas de pagado no se toman en cuenta, así
que un contrato ya pagado sigue inflando el saldo proyectado.

Corrección: las líneas marcadas como pagadas se restan del monto de contratos por facturar,
tanto en Inicio como en Consolidado. La lista de pagados pasa a estar disponible de forma
central (hoy solo la lee la pantalla de contratos), para que las tres pantallas usen el
mismo criterio.

## 2. Botón "Trasladar" en Contratos por facturar del mes

- Se agrega junto a "Exportar a Excel", con la ayuda emergente:
  "Traslada manualmente los contratos que ya fueron marcados como pagados al histórico".
- Pide confirmación indicando cuántas líneas se van a trasladar.
- Las líneas pagadas se guardan en el histórico del mes en curso y desaparecen de la lista
  de contratos mensuales; quedan consultables en la subsección de histórico.
- Si no hay líneas pagadas, el botón queda deshabilitado.
- El traslado se anota en la bitácora (queda registrado quién y cuándo).

## 3. Permiso por usuario

- Nuevo permiso "Trasladar contratos al histórico", en la ficha de cada usuario
  (Administración → Usuarios), junto a los permisos actuales.
- Los administradores lo tienen siempre; los demás solo si se les activa.
- Sin el permiso, el botón no se muestra.

## Detalle técnico

- `src/contexto/AppContexto.tsx`: exponer `contratosMesPagados` (conjunto de claves
  `contratoId|fecha` leído de la preferencia `contratosMesPagados`) y
  `contratosMesTrasladados` (nueva preferencia con las claves ya archivadas manualmente).
  `contratosDelMes` excluye las claves trasladadas.
- `src/routes/index.tsx` y `src/routes/consolidado.tsx`: al calcular `contratosMesUSD`,
  filtrar además `!contratosMesPagados.has(clave)` antes de convertir a dólares.
  `calcularSaldoProyectado` no cambia.
- `src/routes/contratos.tsx`: leer los pagados desde el contexto (quitar el cálculo local
  duplicado), agregar el botón `Trasladar` con `title`/tooltip y confirmación.
  El traslado arma las líneas pagadas del mes corriente (`LineaHistoricoContrato`) y hace
  `POST /contratos-mes-historico` con `mes` actual y **la unión** de las líneas ya
  archivadas de ese mes más las nuevas, porque el endpoint reemplaza el mes completo
  (`DELETE ... WHERE Mes = @mes`). Luego recarga el histórico, agrega las claves a
  `contratosMesTrasladados` y las quita de `contratosMesPagados`.
  En modo demostración se guarda en la preferencia `contratosMesHistorico`, igual que el
  archivado automático.
- Permiso: columna `TrasladarContratosHistorico BIT NOT NULL DEFAULT 0` en `flujo.Usuario`
  (migración idempotente en `Program.cs`, igual que `AsignarFacturaContrato`), campo en
  `Dtos.cs`, `UsuariosEndpoints.cs` (crear/editar/listar + bitácora), `EstadoEndpoints.cs`
  (sesión), `src/data/tipos.ts`, `AppContexto.tsx` y switch en
  `src/routes/usuarios.$usuarioId.tsx`.
- Versión: subir a 1.36.3 en `src/lib/version.ts` y en `FlujoEfectivo.Api.csproj`, con la
  nota de cambios correspondiente.
- Verificación: `tsgo` y revisión en el navegador de la lista, el botón y el saldo proyectado.
