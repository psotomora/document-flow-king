# Despliegue en IIS (Windows Server) — API y aplicación web

Guía paso a paso para una primera publicación. El orden es:

1. Base de datos en SQL Server
2. API (.NET 8) en IIS
3. Aplicación web (React / TanStack Start) en IIS
4. Conectar la aplicación con la API y verificar

Nombres usados en la guía (cámbielos por los suyos):

| Elemento | Valor de ejemplo |
| --- | --- |
| Servidor | `SRV-APP` |
| API | `http://SRV-APP:5080` → carpeta `C:\inetpub\FlujoEfectivoApi` |
| Aplicación web | `http://SRV-APP` (puerto 80) → carpeta `C:\inetpub\FlujoEfectivoWeb` |
| SQL Server | `SRV-SQL` (o `localhost\SQLEXPRESS`), base `FlujoEfectivo` |

---

## 0. Requisitos en el servidor IIS

1. **Rol Web Server (IIS)**: Administrador del servidor → Agregar roles y características → *Web Server (IIS)*. Incluya *Herramientas de administración → Consola de administración de IIS*.
2. **ASP.NET Core Hosting Bundle 8.0** (necesario para la API):
   https://dotnet.microsoft.com/download/dotnet/8.0 → sección *ASP.NET Core Runtime* → **Hosting Bundle**. Instálelo **después** de IIS y luego ejecute en PowerShell (administrador): `iisreset`.
3. **URL Rewrite**: https://www.iis.net/downloads/microsoft/url-rewrite
4. **Application Request Routing (ARR) 3.0**: https://www.iis.net/downloads/microsoft/application-request-routing
   Tras instalarlo: IIS Manager → clic en el **nodo del servidor** → *Application Request Routing Cache* → panel derecho *Server Proxy Settings…* → marcar **Enable proxy** → *Apply*.
5. **Node.js 20 LTS** (para ejecutar la aplicación web): https://nodejs.org
6. **NSSM** (para correr Node como servicio de Windows): https://nssm.cc/download → copie `nssm.exe` (carpeta `win64`) a `C:\Windows\System32`.
7. **Git** (opcional, para clonar): https://git-scm.com/download/win

En la máquina donde va a compilar (puede ser el mismo servidor) además necesita **.NET 8 SDK** (https://dotnet.microsoft.com/download/dotnet/8.0 → *SDK*).

---

## 1. Base de datos

En SSMS conectado a la instancia destino, ejecute en este orden (Abrir archivo → Ejecutar):

| Script | Contenido |
| --- | --- |
| `database/01_esquema.sql` | Base de datos, tablas, índices y vistas |
| `database/02_datos_iniciales.sql` | Monedas, perfiles, compañías, usuario administrador |
| `database/03_datos_demo.sql` | Datos de prueba (**omitir en producción**) |
| `database/04_seguridad.sql` | Usuarios y contraseñas |
| `database/05_parametros.sql` | Parámetros y auditoría del tipo de cambio |
| `database/06_parametros_generales.sql` | Parámetros generales (fuente externa, SoftlandERP) |

Cree un login SQL para la API (recomendado, evita problemas de permisos del grupo de aplicaciones):

```sql
USE master;
CREATE LOGIN flujo_api WITH PASSWORD = 'UnaClaveFuerte#2026';
USE FlujoEfectivo;
CREATE USER flujo_api FOR LOGIN flujo_api;
ALTER ROLE db_datareader ADD MEMBER flujo_api;
ALTER ROLE db_datawriter ADD MEMBER flujo_api;
GRANT EXECUTE TO flujo_api;
GRANT ALTER ON SCHEMA::flujo TO flujo_api; -- la API aplica pequeñas migraciones al iniciar
```

Verifique que SQL Server acepta **autenticación mixta** (propiedades del servidor → Seguridad) y que TCP/IP está habilitado (SQL Server Configuration Manager) si la base está en otro servidor.

---

## 2. Publicar la API en IIS

### 2.1 Obtener el código

```powershell
cd C:\
git clone https://github.com/<su-usuario>/document-flow-king.git
cd C:\document-flow-king\api\FlujoEfectivo.Api
```

### 2.2 Configuración de producción

Cree el archivo `appsettings.Production.json` dentro de `api\FlujoEfectivo.Api` (se copia solo al publicar y **sobrescribe** los valores de `appsettings.json`):

```json
{
  "ConnectionStrings": {
    "FlujoEfectivo": "Server=SRV-SQL;Database=FlujoEfectivo;User Id=flujo_api;Password=UnaClaveFuerte#2026;TrustServerCertificate=True;Encrypt=True;"
  },
  "Jwt": {
    "Emisor": "FlujoEfectivo",
    "Audiencia": "FlujoEfectivoApp",
    "Horas": 8,
    "Llave": "ESCRIBA-AQUI-UNA-LLAVE-SECRETA-LARGA-DE-AL-MENOS-32-CARACTERES"
  },
  "Cors": {
    "Origenes": ["http://SRV-APP", "https://flujo.suempresa.com"]
  }
}
```

- `Server`: `SRV-SQL`, `SRV-SQL\SQLEXPRESS` o `localhost\SQLEXPRESS`.
- `Jwt:Llave`: cualquier texto aleatorio de 32+ caracteres. **No** deje el valor de ejemplo.
- `Cors:Origenes`: la(s) dirección(es) exactas desde donde los usuarios abrirán la aplicación web (sin barra final). Si no coincide, el navegador bloquea las llamadas a la API.

### 2.3 Compilar y publicar

```powershell
cd C:\document-flow-king\api\FlujoEfectivo.Api
dotnet publish -c Release -o C:\inetpub\FlujoEfectivoApi
```

Debe quedar en `C:\inetpub\FlujoEfectivoApi` el archivo `FlujoEfectivo.Api.dll`, `web.config` y `appsettings.Production.json`.
La publicación no copia `appsettings.Production.json`: esto evita sobrescribir accidentalmente la llave y las conexiones propias del servidor. En la primera instalación, créelo manualmente en esa carpeta con el contenido del apartado 2.2. En actualizaciones posteriores, conserve exactamente el archivo existente.

### 2.4 Crear el grupo de aplicaciones

IIS Manager → *Grupos de aplicaciones* → **Agregar grupo de aplicaciones…**

- Nombre: `FlujoEfectivoApi`
- Versión de .NET CLR: **Sin código administrado**
- Modo de canalización: Integrada

Luego clic derecho → *Configuración avanzada* → **Modo de inicio: AlwaysRunning** (opcional, evita el primer arranque lento).

### 2.5 Crear el sitio

IIS Manager → *Sitios* → **Agregar sitio web…**

- Nombre del sitio: `FlujoEfectivoApi`
- Grupo de aplicaciones: `FlujoEfectivoApi`
- Ruta de acceso física: `C:\inetpub\FlujoEfectivoApi`
- Enlace: tipo `http`, dirección IP *Todas las no asignadas*, **puerto 5080**, nombre de host vacío.

Abra el puerto en el firewall si otros equipos consumirán la API directamente:

```powershell
New-NetFirewallRule -DisplayName "Flujo API 5080" -Direction Inbound -Protocol TCP -LocalPort 5080 -Action Allow
```

### 2.6 Permisos de carpeta

```powershell
icacls C:\inetpub\FlujoEfectivoApi /grant "IIS AppPool\FlujoEfectivoApi:(OI)(CI)RX" /T
mkdir C:\inetpub\FlujoEfectivoApi\logs
icacls C:\inetpub\FlujoEfectivoApi\logs /grant "IIS AppPool\FlujoEfectivoApi:(OI)(CI)M" /T
```

### 2.7 Probar la API

En el navegador del servidor: `http://localhost:5080/api/salud`

Debe devolver un JSON con `estado: "ok"`, la versión de la API y `operaciones.crearUsuarios: true`. Si muestra una versión anterior, IIS conserva una publicación previa. Detenga el grupo de aplicaciones, publique de nuevo y vuelva a iniciarlo:

```powershell
Import-Module WebAdministration
Stop-WebAppPool -Name "FlujoEfectivoApi"
cd C:\document-flow-king\api\FlujoEfectivo.Api
dotnet publish -c Release -o C:\inetpub\FlujoEfectivoApi
Start-WebAppPool -Name "FlujoEfectivoApi"
Invoke-RestMethod http://localhost:5080/api/salud
```

No elimine `appsettings.Production.json`. Confirme que la salida indique `versionApi: 1.16.3` y `crearUsuarios: true` antes de probar la pantalla de usuarios.

Si aparece **HTTP 500.30 / 500.31** (la API no logra iniciar):

Desde la versión 1.36.6 el `web.config` publicado ya trae `stdoutLogEnabled="true"` y errores detallados, así que el motivo queda escrito en disco.

1. Cree la carpeta `C:\inetpub\FlujoEfectivoApi\logs` y dé permiso de escritura a `IIS AppPool\FlujoEfectivoApi`.
2. Reintente la petición y abra el archivo más reciente de `C:\inetpub\FlujoEfectivoApi\logs\stdout_*.log`: la última línea indica la causa exacta.
3. La forma más rápida de verlo: `cd C:\inetpub\FlujoEfectivoApi` y ejecutar `dotnet FlujoEfectivo.Api.dll`; el error aparece en pantalla.
4. Causas típicas:
   - Falta `appsettings.Production.json` (se conserva entre publicaciones; si se borró, vuelva a crearlo con la cadena de conexión, `Jwt:Llave` y `Licencia`).
   - JSON mal formado en `appsettings.Production.json` (una coma de más impide el arranque).
   - Falta `Jwt:Llave` o tiene menos de 32 caracteres.
   - ASP.NET Core Hosting Bundle ausente o desactualizado (instalar y `iisreset`).
   - Cadena de conexión incorrecta o login SQL sin permisos.
   - El grupo de aplicaciones no está en "Sin código administrado" o no tiene permiso de lectura sobre la carpeta.
5. Después de corregir: `iisreset` o reinicie el grupo de aplicaciones y pruebe `http://flujoefectivo.local/api/salud`.


---

## 3. Publicar la aplicación web en IIS

La aplicación tiene una parte de servidor (Node) que entrega las páginas. IIS actúa como *proxy inverso* hacia ese proceso Node, que se ejecuta como servicio de Windows.

### 3.1 Compilar para servidor Node

En la máquina de compilación (con Node.js 20+):

```powershell
cd C:\document-flow-king
npm install
npm run build:node
```

> No hace falta definir `NITRO_PRESET`: el proyecto ya compila siempre como
> servidor Node fuera del entorno de Lovable, y `build:node` verifica el
> resultado automáticamente. Si la verificación falla, borre `.output` y repita.

> Si PowerShell bloquea `npm`: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

La salida queda en la carpeta `.output\`:

- `.output\server\index.mjs` → servidor Node
- `.output\public\` → archivos estáticos

> Comprobación manual opcional:
>
> ```powershell
> node ".output\server\index.mjs"   # debe quedarse escuchando en el puerto 3000
> ```


### 3.2 Copiar al servidor

```powershell
mkdir C:\inetpub\FlujoEfectivoWeb
xcopy .output C:\inetpub\FlujoEfectivoWeb /E /I /Y
copy public\web.config C:\inetpub\FlujoEfectivoWeb\web.config
```

El `web.config` incluido ya trae la regla `ReverseProxy` hacia `http://localhost:3000`.

### 3.3 Registrar Node como servicio de Windows (NSSM)

PowerShell como administrador:

```powershell
nssm install FlujoEfectivoWeb "C:\Program Files\nodejs\node.exe" "C:\inetpub\FlujoEfectivoWeb\server\index.mjs"
nssm set FlujoEfectivoWeb AppDirectory C:\inetpub\FlujoEfectivoWeb
nssm set FlujoEfectivoWeb AppEnvironmentExtra PORT=3000 HOST=127.0.0.1 NODE_ENV=production
nssm set FlujoEfectivoWeb Start SERVICE_AUTO_START
nssm start FlujoEfectivoWeb
```

Compruebe en el servidor: `http://localhost:3000` debe mostrar la pantalla de inicio de sesión. Si no arranca, ejecute manualmente `node C:\inetpub\FlujoEfectivoWeb\server\index.mjs` para ver el error.

### 3.4 Crear el sitio en IIS

1. *Grupos de aplicaciones* → **Agregar**: nombre `FlujoEfectivoWeb`, CLR **Sin código administrado**.
2. Si el *Default Web Site* usa el puerto 80, deténgalo o cámbielo de puerto.
3. *Sitios* → **Agregar sitio web…**
   - Nombre: `FlujoEfectivoWeb`
   - Grupo de aplicaciones: `FlujoEfectivoWeb`
   - Ruta física: `C:\inetpub\FlujoEfectivoWeb`
   - Enlace: `http`, puerto **80** (o el que desee), nombre de host vacío o su dominio.
4. Permisos: `icacls C:\inetpub\FlujoEfectivoWeb /grant "IIS AppPool\FlujoEfectivoWeb:(OI)(CI)RX" /T`
5. Firewall: `New-NetFirewallRule -DisplayName "Flujo Web 80" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow`

Abra `http://SRV-APP` desde otro equipo: debe cargar la pantalla de inicio de sesión. Si sale **404.4 / 500.52** o una página en blanco, revise que URL Rewrite y ARR estén instalados y el proxy habilitado (paso 0.4).

---

## 4. Conectar la aplicación con la API y verificar

1. Abra `http://SRV-APP` en el navegador.
2. En la pantalla de inicio de sesión, en la parte inferior, use la opción de **conexión a la API** e ingrese `http://SRV-APP:5080` (la dirección **que el navegador del usuario puede alcanzar**, no `localhost`). Guarde; el sistema prueba `/api/salud` antes de aceptar.
3. Inicie sesión con el usuario administrador creado por `02_datos_iniciales.sql` / `04_seguridad.sql` y cambie su contraseña.
4. Verifique: Tablero, Bancos, Parámetros (tipo de cambio) y creación de un usuario nuevo.
5. La versión publicada se muestra al pie de la pantalla de inicio de sesión.

> Esa dirección de la API se guarda en el navegador de cada usuario. Si prefiere que quede fija, puede publicar la API como aplicación virtual `/api` dentro del sitio web (IIS Manager → clic derecho en `FlujoEfectivoWeb` → *Agregar aplicación*, alias `api`, ruta `C:\inetpub\FlujoEfectivoApi`, grupo `FlujoEfectivoApi`) y usar `http://SRV-APP` como URL de la API. En ese caso, agregue en `web.config` del sitio web una regla `<rule name="Api" stopProcessing="true"><match url="^api/.*" /><action type="None" /></rule>` **antes** de `ReverseProxy` para que IIS no reenvíe `/api` a Node.

---

## 5. HTTPS (recomendado)

1. IIS Manager → nodo del servidor → *Certificados de servidor* → importar el certificado (.pfx) o solicitar uno.
2. En cada sitio → *Enlaces* → agregar `https` con el certificado.
3. Actualice `Cors:Origenes` en `appsettings.Production.json` con la URL `https://...` y reinicie el grupo de aplicaciones de la API.
4. Use la URL `https` de la API en la pantalla de conexión.

---

## 6. Actualizar a una versión nueva

**API**

```powershell
cd C:\document-flow-king
git pull
cd api\FlujoEfectivo.Api
dotnet publish -c Release -o C:\inetpub\FlujoEfectivoApi
```
(`appsettings.Production.json` se conserva porque está en el código fuente; si IIS bloquea archivos, detenga el grupo de aplicaciones antes de publicar y vuelva a iniciarlo.)

**Aplicación web**

```powershell
cd C:\document-flow-king
npm install
npm run build:node
nssm stop FlujoEfectivoWeb
xcopy .output C:\inetpub\FlujoEfectivoWeb /E /I /Y
nssm start FlujoEfectivoWeb
```

Los usuarios deben refrescar con **Ctrl+F5**.

---

## 7. Solución de problemas rápida

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| API: 500.30/500.31 | Falta Hosting Bundle o error al iniciar | Instalar Hosting Bundle, `iisreset`, activar `stdoutLogEnabled` |
| API: `Login failed for user` | Login SQL o autenticación mixta | Revisar paso 1 y cadena de conexión |
| Web: "Unexpected token '<' … not valid JSON" | URL de la API apunta al sitio web, no a la API | Usar `http://SRV-APP:5080` |
| Web: error de CORS en consola (F12) | Origen no está en `Cors:Origenes` | Agregar la URL exacta y reiniciar el grupo de la API |
| Web: 502.3 / 404 al abrir | Servicio Node detenido o proxy ARR no habilitado | `nssm status FlujoEfectivoWeb`, paso 0.4 |
| Web: refrescar `/facturas` da 404 | `web.config` no está en la raíz del sitio | Copiar `public\web.config` |

## Licenciamiento (1.36.0)

1. En el servidor **emisor interno de Aplix**, ingrese como administrador y abra
   **Parámetros → Licencia del sistema → Emitir licencias** (o la dirección `/licencias`).
   Use **Generar par de llaves** una sola vez:
   - la **llave privada** se copia en `appsettings.Production.json` del emisor, en
     `"Licencia": { "LlavePrivada": "...", "Emisor": "true" }`;
   - la **llave pública** se copia en `"Licencia": { "LlavePublica": "..." }` de cada
     instalación de cliente. Nunca comparta la llave privada.
2. En la instalación del cliente, ejecute `database/14_licencia.sql` (o deje que la API
   cree las tablas al iniciar) y abra **Parámetros → Licencia del sistema** para copiar la
   **huella del servidor**.
3. En el emisor, complete cliente, vencimiento, huella, compañías, usuarios permitidos y
   días de gracia, y presione **Emitir y descargar licencia**: se genera un archivo `.lic`
   firmado y queda registrado en el historial.
4. En el cliente, cargue ese archivo con **Cargar archivo de licencia** y active
   **Exigir licencia válida**.

Comportamiento: 30 días antes del vencimiento aparece un aviso; al vencer, el sistema
sigue operando durante los días de gracia con aviso en rojo; agotada la gracia —o si la
licencia es de otro servidor— la API responde 402 y solo permite autenticarse y cargar
una licencia nueva. El límite de usuarios impide activar usuarios adicionales.
