# Sistema de Control de Flujo de Efectivo — Maqueta navegable (Aplix)

Maqueta de alta fidelidad, en español y con formatos de Costa Rica, que cubre las pantallas del ERS. Sin base de datos ni autenticación real: todos los datos vienen de un archivo de datos de ejemplo en el propio proyecto, y los cálculos del ERS se ejecutan de verdad sobre esos datos para que las cifras sean coherentes y demostrables ante el cliente.

## Qué se entrega en cada fase

### Fase 1 — Núcleo operativo
- **Layout general**: barra lateral con los módulos, encabezado con selector de compañía (THERONIX / APLIX), selector de moneda y usuario simulado con su perfil.
- **Catálogos (RF-001)**: compañías, cuentas bancarias (BAC TX, PROMERICA TX, BAC AX, PROMERICA AX) con saldo inicial en USD y CRC, monedas, y la marca de activo/inactivo.
- **Facturas por cobrar (RF-002, RF-003, RF-004, RF-014)**: listado con filtros por compañía, cliente, moneda, estado y rango de fechas; formulario de registro; columnas calculadas de solo lectura (vencimiento, días para vencer, total pagado, saldo pendiente, estado) y semáforo verde / ámbar / rojo con el estado también en texto.
- **Pagos recibidos (RF-005)**: registro asociado a una factura, con pagos parciales, saldo resultante y aviso cuando lo pagado supera lo facturado. **Ajuste aplicado**: se permite pagar en moneda distinta a la de la factura, capturando el tipo de cambio de la operación.
- **Erogaciones (RF-006)**: registro por compañía, banco, número de transferencia, proveedor, fecha, moneda, monto y notas, con equivalente en dólares.
- **Tipo de cambio (RF-007)**: pantalla de parámetros con el valor vigente y su historial (fecha y usuario), editable solo desde el perfil administrador simulado.
- **Saldo por banco (RF-008)**: saldo inicial + pagos, total de erogaciones y saldo neto, en columnas separadas por moneda y con fila consolidada; USD y CRC nunca se suman.

### Fase 2 — Proyección y análisis
- **Saldo proyectado consolidado (RF-009)**: proyectado en USD, en CRC, equivalente en dólares y total consolidado, con y sin pedidos pendientes; cada indicador rotulado con su moneda.
- **Proyección por tramos (RF-010)**: vencido sin cobrar, 0–7, 8–15, 16–30, 31–60 y más de 60 días, con monto, cantidad de facturas y porcentaje; bloques independientes para USD y CRC, cada uno con su total.
- **Contratos e ingresos diferidos (RF-011)**: periodicidad mensual a anual, próxima facturación, plazo, monto, indicador de facturado, total comprometido y filtros. **Ajuste aplicado**: campo de estado del contrato (activo / cancelado).
- **Pedidos pendientes (RF-012)**: registro y total de pedidos no facturados. **Ajuste aplicado**: los contratos no son pedidos; el pedido lleva su propio tipo/estado y los contratos viven en su módulo aparte.
- **Tablero (RF-013)**: total facturado, cobrado, saldo por cobrar y porcentaje cobrado por moneda; conteo de facturas por estado; saldo vencido; gráficos de distribución y de cobrado vs. pendiente; saldo pendiente por cliente de mayor a menor. **Ajuste aplicado**: conmutador de período semanal / mensual.

### Fase 3 — Control y salidas
- **Perfiles (RF-015)**: cambio simulado entre administrador, registro y consulta, con la interfaz reaccionando de verdad (consulta en solo lectura, catálogos y tipo de cambio solo para administrador) y pantalla de inicio de sesión de maqueta.
- **Bitácora (RF-016)**: listado de solo lectura con usuario, fecha y hora, módulo, registro, operación y valores anterior/nuevo, con filtros.
- **Exportación (RF-017)**: botones de Excel y PDF en listados y reportes, respetando filtros, con fecha, hora y usuario en el archivo.
- **Carga inicial (RF-018)**: asistente de importación con vista previa, validación, informe de filas rechazadas con su motivo y regla de "fila completa o rechazada".

## Fuera de alcance (según el ERS)
Integración con SoftlandERP, conexión bancaria y conciliación automática, tipo de cambio automático, contabilidad general, comprobantes electrónicos, app móvil nativa, migración histórica y Estado de Flujo de Efectivo.

## Detalles técnicos
- React + TypeScript + Tailwind sobre TanStack Start; una ruta por módulo bajo `src/routes`.
- Los datos viven en módulos de ejemplo bajo `src/data` y el estado de la sesión (compañía, perfil, tipo de cambio, registros agregados durante la demo) se mantiene en memoria mediante un contexto de React: se puede crear, editar y borrar durante la demostración, y todo se reinicia al recargar.
- Las reglas del ERS (vencimiento, días para vencer, saldo pendiente, estado, saldos por banco, tramos de proyección, indicadores) se implementan en funciones puras en `src/lib/calculos`, de modo que sean directamente portables a la implementación definitiva.
- Formato es-CR para fechas, números y moneda; toda la interfaz en español.
- Exportación real a Excel y PDF desde el navegador sobre los datos de la maqueta.
- Nota de desviación: el ERS pide Blazor Server + SQL Server (RNF-001). Esta maqueta usa React y no persiste datos; las reglas de negocio y la UX quedan validadas para portarlas después.

## Pendiente de tu parte
La paleta corporativa de Aplix (códigos de color, tipografía o logo). Mientras la envías, arranco con una identidad financiera sobria en azul corporativo y neutros, y la sustituyo en cuanto tenga la oficial.
