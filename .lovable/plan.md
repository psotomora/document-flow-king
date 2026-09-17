# Etapa 1 — Convertir la aplicación en multicliente (SaaS)

Objetivo: una sola instalación en la VM de Azure que atienda a varios clientes, cada uno con **su propia base de datos** y su propia conexión al SQL externo del ERP. El cliente se elige en la pantalla de acceso y Aplix administra las altas desde una pantalla nueva.

## Qué verá el usuario

1. **Pantalla de acceso**: además de usuario y contraseña, una lista "Empresa" con los clientes activos. El sistema recuerda la última empresa usada en ese navegador.
2. **Pantalla nueva "Clientes" (solo Aplix)**: lista de clientes con alta, edición y activación/desactivación. Por cada cliente: nombre, código corto, servidor y base de datos, y un botón **Probar conexión**. Solo la ve un perfil nuevo de superadministrador.
3. **El resto de la aplicación no cambia visualmente**. Cada persona ve únicamente los datos, parámetros, usuarios, bitácora y conexión externa (SoftlandERP) de su empresa, porque toda la sesión trabaja contra la base de ese cliente.
4. **Indicador de empresa** en el panel izquierdo, junto a la licencia, para que sea evidente en cuál se está trabajando.

## Alcance de esta etapa

Incluye: catálogo de clientes, elección de empresa al entrar, aislamiento por base de datos, pantalla de administración de clientes y creación automática de la estructura de una base nueva.

No incluye (etapas siguientes): facturación/cobro a clientes, autoservicio de registro, subdominios por cliente, licencias diferenciadas por cliente y métricas de uso.

## Detalle técnico

### Base de datos de catálogo (nueva)

- Nueva base `FlujoEfectivoCatalogo` con `catalogo.Cliente`: `ClienteId`, `Codigo`, `Nombre`, `Servidor`, `BaseDatos`, `Usuario`, `ClaveCifrada` (AES con `Jwt:Llave`, igual que `flujo.FuenteExterna`), `Encriptar`, `Activo`, `Creado`.
- Script idempotente `database/tenant/00_catalogo.sql` y auto-migración al iniciar la API, siguiendo el patrón de `Program.cs`.
- Los scripts actuales `01`–`16` pasan a ser la **plantilla de cliente**: se quita el `USE FlujoEfectivo` fijo para poder ejecutarlos sobre cualquier base.

### Resolución de conexión por cliente

- `Db` deja de leer una cadena fija: nueva clase `Catalogo` (cache en memoria con expiración corta) que arma la cadena del cliente; `Db.Abrir()` usa el `ClienteId` del contexto de la petición.
- `TokenServicio`: el JWT incorpora el claim `cli` (ClienteId). `Db` lo lee desde `IHttpContextAccessor`; sin claim válido responde 401. Esto garantiza que ninguna consulta pueda quedarse sin filtro, porque el aislamiento está en la conexión, no en un `WHERE`.
- `POST /auth/login` recibe además `clienteCodigo`; valida que el cliente exista y esté activo, abre su base y verifica al usuario allí.
- `GET /api/clientes-publicos` (anónimo): devuelve solo código y nombre de los clientes activos para llenar la lista de la pantalla de acceso.
- `GET /api/salud` verifica el catálogo; se agrega `GET /api/salud/{codigo}` para diagnosticar la base de un cliente.

### Superadministrador y pantalla de clientes

- Perfil `superadmin` en la base de catálogo con sus propios usuarios (`catalogo.UsuarioAplix`), independiente de los usuarios de cada cliente.
- Endpoints `GET/POST/PUT /api/admin/clientes`, `POST /api/admin/clientes/{id}/probar` y `POST /api/admin/clientes/{id}/aprovisionar` (ejecuta la plantilla de scripts sobre la base del cliente y crea su usuario administrador inicial).
- Ruta nueva `src/routes/clientes.tsx` y su opción en `AppShell.tsx`, visible solo con perfil `superadmin`.
- Toda alta o cambio queda en la bitácora del catálogo.

### Frontend

- `PantallaLogin.tsx`: selector de empresa alimentado por `/clientes-publicos`, recordado en el navegador; se envía en el login.
- `AppContexto.tsx`: el cliente activo forma parte de la sesión; al cerrar sesión se limpia el estado para no mezclar datos entre empresas.
- `ResumenLicencia.tsx` / panel lateral: mostrar el nombre de la empresa activa.

### Operación en Azure

- La VM solo necesita alcanzar cada SQL de cliente y cada SQL externo del ERP: IP pública con firewall restringido a la IP de la VM, o VPN/Private Link. Conexiones con `Encrypt=True`.
- Usuario SQL de solo lectura para las fuentes externas de cada cliente.
- Documentación nueva `docs/MULTICLIENTE.md` con el alta de un cliente paso a paso; `docs/DESPLIEGUE-IIS.md` se actualiza con la base de catálogo.

### Versión

- Subir a 1.38.0 en `src/lib/version.ts` y en `FlujoEfectivo.Api.csproj`, con las entradas de historial.
- Verificación con `bunx tsgo --noEmit`.

## Riesgo principal

Es un cambio de base: toda instalación existente debe migrarse registrando su base actual como el primer cliente del catálogo. El script de catálogo lo hará automáticamente a partir de la cadena de conexión configurada, de modo que la instalación actual siga funcionando sin intervención manual.
