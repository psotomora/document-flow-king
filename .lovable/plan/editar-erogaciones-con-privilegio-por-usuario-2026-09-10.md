# Editar erogaciones con privilegio por usuario

## Objetivo
Agregar un permiso individual, administrado únicamente por usuarios administradores, que habilite el botón y la operación de editar erogaciones. Aumentar la versión del producto y de la API.

## Cambios
- Incorporar el permiso `Editar erogaciones` al mantenimiento de usuarios, con valor predeterminado permitido para conservar compatibilidad con usuarios existentes; los administradores siempre podrán editar.
- Agregar la columna correspondiente mediante el script de permisos y la actualización automática de la API.
- Incluir el permiso en los datos de usuario, creación, actualización, carga de sesión y bitácora de seguridad.
- Añadir una acción de edición por línea en Erogaciones y reutilizar el formulario para modificar compañía, documento asociado, banco, transferencia, proveedor, fecha, moneda, monto y notas.
- Crear la operación de actualización en la API, validar el privilegio en el servidor y registrar valores anteriores y nuevos en la bitácora.
- Ajustar correctamente el saldo del documento por pagar cuando cambie la erogación vinculada, su monto o su documento.
- Actualizar el modo demostración, la versión a `1.30.1` y validar tipos, pantalla y flujo de edición.

## Detalles técnicos
- La autorización efectiva se comprobará en SQL Server a partir del usuario autenticado, no solo ocultando el botón.
- El permiso de edición será independiente del permiso para visualizar Erogaciones y del privilegio administrativo para eliminar.
- Se mantendrán los filtros, totales, encabezado fijo y cantidad de filas actuales.
