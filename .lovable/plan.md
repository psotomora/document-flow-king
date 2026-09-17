# Mensaje controlado para errores del servidor

## Cambios
- Detectar respuestas HTML de IIS al probar o usar la API y evitar mostrar su contenido al usuario.
- Para errores 500, 502, 503 y 504, mostrar una instrucción clara: solicitar al administrador revisar que la API esté iniciada, consultar el registro de IIS/API y validar la configuración y los scripts de base de datos.
- Conservar en un bloque breve de detalle técnico el código HTTP, la operación solicitada y la identificación disponible, sin incluir la página HTML.
- Mantener los mensajes actuales para errores JSON propios de la API y para direcciones incorrectas.
- Subir la aplicación y la API a la versión 1.37.2 y registrar el cambio en el historial.

## Verificación
- Comprobar el manejo de una respuesta HTML 500 y confirmar que no se exponga su contenido.
- Ejecutar la validación de TypeScript y las pruebas relacionadas disponibles.
