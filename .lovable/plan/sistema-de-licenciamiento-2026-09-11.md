# Sistema de licenciamiento

Objetivo: una aplicación web interna (solo para su equipo) que emita archivos de licencia, y un mecanismo de validación que se pueda reutilizar en Cash Flow y en las próximas aplicaciones.

## Cómo funciona

```text
App interna de licencias        Cliente (servidor del cliente)
  1. Registra cliente        ->  3. Sube el archivo .lic en Parámetros
  2. Genera archivo .lic         4. La aplicación lo valida y lo guarda
     firmado digitalmente        5. Avisa antes de vencer, luego bloquea
```

La licencia es un archivo de texto firmado con una llave privada que solo ustedes tienen. Cada aplicación lleva incorporada la llave pública, así que puede comprobar por su cuenta que el archivo es auténtico y que nadie le cambió una fecha o un límite. No se necesita conexión a internet ni llamadas a un servidor de licencias.

## Qué contiene la licencia

- Cliente (nombre y código)
- Producto y versión mínima
- Fecha de emisión y fecha de vencimiento
- Compañías permitidas (códigos)
- Cantidad máxima de usuarios activos
- Huella del servidor autorizado
- Días de gracia después del vencimiento
- Firma digital

## Atadura al servidor

Cada instalación genera una huella a partir del nombre del equipo y del identificador de la máquina. En Parámetros se muestra esa huella con un botón para copiarla; el cliente la envía y ustedes emiten la licencia para esa huella. Si el archivo se copia a otro servidor, no valida.

Para casos de migración o cambio de servidor, la app de licencias permite reemitir la licencia con una huella nueva (queda registrado quién la reemitió y cuándo).

## Comportamiento al vencer

1. Vigente: funciona normal.
2. Faltan 30 días o menos: aviso visible en el encabezado y en Parámetros.
3. Vencida, dentro del periodo de gracia: aviso rojo permanente al ingresar, la aplicación sigue operando.
4. Terminado el periodo de gracia: no se permite ingresar; solo queda la pantalla para cargar una licencia nueva.

También se bloquea si la huella no coincide, si la compañía seleccionada no está en la licencia, o si se supera el máximo de usuarios activos (en ese caso no se puede activar otro usuario, pero los existentes siguen trabajando).

## Aplicación generadora (interna)

Proyecto web nuevo, separado, con acceso restringido a su equipo. Pantallas:

- Clientes: alta y edición de clientes.
- Licencias: emitir nueva licencia (producto, vencimiento, compañías, usuarios, huella, días de gracia), descargar el archivo `.lic`, reemitir o revocar.
- Historial: todas las licencias emitidas, con quién y cuándo, y su estado.

Las llaves de firma se guardan como secreto del proyecto generador; la llave pública se copia dentro de cada aplicación cliente.

## Cambios en Cash Flow

- Parámetros: nueva tarjeta "Licencia" con estado, cliente, vencimiento, compañías, usuarios permitidos, huella del servidor y botón para cargar el archivo.
- Aviso de vencimiento en el encabezado y pantalla de bloqueo cuando corresponda.
- Validación en el servidor al iniciar sesión y al arrancar la API, para que no se pueda evadir desde el navegador.
- La licencia cargada y cada cambio quedan en bitácora.

## Detalle técnico

- Formato: JSON compacto en Base64 + firma Ed25519, extensión `.lic`. Llave pública incrustada en la API .NET (`Licencia/Verificador.cs`).
- Huella: SHA-256 de `MachineName` + `MachineGuid` del registro de Windows, truncada a 16 caracteres.
- Nueva tabla `flujo.Licencia` (archivo, datos derivados, fecha de carga, usuario) más script `database/14_licencia.sql` y creación automática al iniciar, igual que `ConfiguracionCorreo`.
- Endpoints: `GET /api/licencia` (estado y huella), `POST /api/licencia` (cargar, solo administrador). Ambos validan firma, huella y vigencia.
- Middleware que devuelve 402 con detalle cuando la licencia está bloqueada, respetando `/salud`, `/auth/login` y `/licencia`.
- App generadora: proyecto Lovable aparte con Lovable Cloud (tablas `clientes`, `licencias`), firma en función de servidor con la llave privada guardada como secreto.
- Versión de Cash Flow y de la API: 1.36.0.

## Orden de trabajo

1. App generadora: modelo de datos, generación de llaves, emisión y descarga del `.lic`.
2. Cash Flow: verificación, huella, almacenamiento y endpoints.
3. Cash Flow: tarjeta en Parámetros, avisos y pantalla de bloqueo.
4. Documentación de instalación y reemisión.
