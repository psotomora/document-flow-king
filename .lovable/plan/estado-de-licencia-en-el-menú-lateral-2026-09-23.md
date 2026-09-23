# Estado de licencia en el menú lateral

## Resultado
- Mostrar en la esquina inferior izquierda una sección compacta con el estado actual de la licencia.
- Mostrar la fecha de vencimiento cuando la licencia tenga una fecha registrada.
- Mantener la información visible también en el menú lateral de teléfono y tablet.

## Comportamiento
- Consultar el estado de licencia al abrir la aplicación.
- Usar etiquetas claras para licencia vigente, próxima a vencer, en gracia, bloqueada, ausente o no requerida.
- Aplicar el color de estado existente: correcto, advertencia o crítico.
- Si la consulta no está disponible o falla, no interrumpir el uso de la aplicación.

## Versión
- Aumentar aplicación y API de 1.37.4 a 1.37.5.
- Agregar la mejora al historial de versiones con fecha 2026-09-23.

## Verificación
- Validar que el proyecto compile y que la sección no altere el menú lateral.
