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
| `database/07…15_*.sql` | Actualizaciones posteriores (permisos, preferencias, documentos, contratos, correo, licencia) |
| `database/16_transferencias.sql` | Transferencias de fondos entre cuentas bancarias |
| `database/17_pago_factura_pagada.sql` | Pagos bancarios asociados a facturas ya pagadas sin modificar su estado |
| `database/18_agente_sincronizacion.sql` | Fase 1 SaaS: inquilinos y estado de sincronización con el ERP |

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

Cree el archivo `appsettings.Production.json` directamente en la carpeta de la API del servidor (`C:\inetpub\FlujoEfectivoApi`). No se incluye al publicar ni en el ZIP; conserve este archivo en cada actualización. Sus valores **sobrescriben** los de `appsettings.json` si existe:

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

### 2.3.1 Compilar y crear el ZIP automáticamente (desde 1.38.43)

Desde la **raíz** del proyecto, no desde la carpeta de la API:

```powershell
cd C:\github\document-flow-king
npm run package:api
```

Requiere el SDK de .NET 8 en la computadora de desarrollo. El comando ejecuta
`dotnet publish` en Release en una carpeta temporal nueva, verifica el resultado
y crea `cashflow-api-1.38.43.zip` en la raíz. Windows utiliza PowerShell;
Linux/macOS requiere `zip`. No hace falta ejecutar `build:api` antes.

El ZIP contiene directamente `FlujoEfectivo.Api.dll`, dependencias,
`FlujoEfectivo.Api.deps.json`, `FlujoEfectivo.Api.runtimeconfig.json` y la
plantilla `web.config`. **No contiene ningún `appsettings*.json`**, credenciales,
archivos `.env`, certificados, licencias, logs, SQL ni metadatos Git.
No guarde los ZIP generados en el repositorio.

Para actualizar una API existente, haga un respaldo de su carpeta, extraiga el
ZIP a una carpeta temporal nueva y conserve **todos los appsettings y el
web.config existentes** del servidor. En PowerShell como administrador:

```powershell
Import-Module WebAdministration
Expand-Archive -Path C:\transferencias\cashflow-api-1.38.43.zip -DestinationPath C:\transferencias\api-1.38.43
Stop-WebAppPool -Name "FlujoEfectivoApi"
try {
    robocopy C:\transferencias\api-1.38.43 C:\inetpub\FlujoEfectivoApi /E /XF web.config appsettings*.json
    if ($LASTEXITCODE -ge 8) { throw "Error al copiar la API; revise la salida de robocopy." }
} finally {
    Start-WebAppPool -Name "FlujoEfectivoApi"
}
```

No use `/MIR`: borraría la configuración que no viene en el ZIP. En una
instalación nueva, copie también la plantilla `web.config` y cree la
configuración del apartado 2.2. Adapte el nombre del grupo de aplicaciones
al que realmente usa la API en IIS; NSSM corresponde solo a la web.

Verifique `https://apps.aplix.cr/api/salud`: la API sigue en **1.38.41**;
**1.38.43 es la versión de la aplicación y del nombre del paquete**.
Este cambio no añade código de API ni SQL. Si está completando la publicación
de Fase 1 pendiente, debe ejecutar `database/18_agente_sincronizacion.sql`
si aún no lo hizo. El paquete web sigue generándose con `npm run package:node`.

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

> **Publicación en una subcarpeta** (por ejemplo `http://SRV-APP/cashflow`).
> Fuera de Lovable, el proyecto usa `/cashflow` automáticamente. Por tanto,
> para el despliegue habitual basta con ejecutar `npm run build:node`.
> Si necesita publicar con una ruta diferente, use **una** de estas opciones:
>
> *Forma A (archivo, recomendada):* cree en la raíz del proyecto el archivo
> `ruta-base.txt` con una sola línea, por ejemplo `/otra-ruta`. Luego
> `npm run build:node`.
>
> *Forma B (variable de PowerShell):* escriba las dos líneas **en la misma
> ventana de PowerShell**, una después de la otra (la variable solo vive en esa
> ventana; si abre otra o reinicia, se pierde):
>
> ```powershell
> cd C:\document-flow-king
> $env:APP_BASE_PATH = "/otra-ruta"
> npm run build:node
> ```
>
> Al iniciar la compilación debe leerse:
> Para la publicación habitual debe leerse:
> `[vite] Ruta base de la aplicación: /cashflow`. Si dice `/`, no publique esa
> salida: borre la carpeta `.output` y repita.
>
> Con esto, los estilos, los scripts y la navegación usan el prefijo
> `/cashflow`. **Configuración en IIS (elija según su caso):**
> - *Si el sitio de IIS solo publica esta aplicación* (todo se reenvía al
>   proceso Node): **no se requiere ningún cambio**. La regla `ReverseProxy`
>   del `web.config` ya conserva el prefijo: `/cashflow/...` llega a Node como
>   `http://localhost:3000/cashflow/...`.
> - *Si el mismo sitio también publica otras páginas en la raíz*: agregue en el
>   `web.config` de la **raíz del sitio** una regla que solo reenvíe la
>   subcarpeta (y comente la regla `ReverseProxy` general):
>
>   ```xml
>   <rule name="CashflowSubcarpeta" stopProcessing="true">
>     <match url="^cashflow/(.*)" />
>     <action type="Rewrite" url="http://localhost:3000/cashflow/{R:1}" />
>   </rule>
>   ```
>
>   Requiere **URL Rewrite** y **ARR** con el proxy habilitado (paso 0.4).
>   Como alternativa a la regla, puede crear en IIS una *aplicación virtual*
>   llamada `cashflow` que apunte a una carpeta con el `web.config` del sitio;
>   con la aplicación virtual no hace falta regla.
>
>   **Caso real: `https://apps.aplix.cr/cashflow`** (el sitio `apps.aplix.cr`
>   publica varias aplicaciones y esta va en la subcarpeta `cashflow`):
>   1. Ejecute `npm run build:node` y copie `.output\` a la carpeta del proceso
>      Node (por ejemplo `C:\inetpub\FlujoEfectivoWeb`).
>      Verifique en pantalla `[vite] Ruta base de la aplicación: /cashflow`.
>   2. En el sitio `apps.aplix.cr` de IIS agregue **solo** la regla
>      `CashflowSubcarpeta` de arriba (ajuste el puerto si el proceso Node de
>      esta aplicación usa otro). **No** agregue reglas generales ni la regla
>      `ApiReverseProxy` a ese sitio compartido: capturarían `/api` de las
>      demás aplicaciones.
>   3. La API .NET está publicada en `https://apps.aplix.cr/api`. La aplicación
>      detecta `/api` del mismo dominio automáticamente; no se configura en
>      cada navegador y limpiar los datos del sitio no altera la conexión.
>   4. Mantenga `/api` fuera del proxy de la aplicación web. Para una API en
>      otro dominio, configure `VITE_API_URL` al compilar y permita el origen
>      web en `Cors:Origenes` de la API.
>
> **MUY IMPORTANTE — archivos en subcarpeta.** Desde la versión 1.36.16, la
> compilación configura la misma ruta `/cashflow` tanto para Vite como para
> Nitro. No configure `NITRO_APP_BASE_URL` en NSSM y no agregue una regla
> separada para `cashflow/assets`. La regla `CashflowSubcarpeta` debe conservar
> el prefijo completo.
>
> Al finalizar, `build:node` verifica que exista físicamente
> `.output\public\assets\app.css`; Nitro la expone públicamente como
> `/cashflow/assets/app.css`. Si no existe, la compilación termina
> con error para impedir una publicación incompleta.
>
> Para comprobar la publicación, copie de la consola del navegador la dirección
> exacta de cualquier `.js` o `.css` y ábrala en una pestaña. Debe responder 200,
> no 404.

> No hace falta definir `NITRO_PRESET`: el proyecto ya compila siempre como
> servidor Node fuera del entorno de Lovable, y `build:node` verifica el
> resultado automáticamente. Si la verificación falla, borre `.output` y repita.

> Si PowerShell bloquea `npm`: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`.

> Desde la versión 1.36.13 el logotipo se empaqueta dentro de la aplicación
> (pantallas, favicon y PDF de estado de cuenta), por lo que la publicación no
> depende de ningún dominio externo.

La salida queda en la carpeta `.output\`:

- `.output\server\index.mjs` → servidor Node
- `.output\public\` → archivos estáticos

> Comprobación manual opcional:
>
> ```powershell
> node ".output\server\index.mjs"   # debe quedarse escuchando en el puerto 3000
> ```


### 3.2 Copiar al servidor

**Alternativa con paquete ZIP (como NotifyHub, desde 1.38.39):**

Ejecute desde la raíz del proyecto en su computadora de desarrollo:

```powershell
cd C:\document-flow-king
npm install
npm run package:node
```

El comando ejecuta `build:node`, verifica el resultado y crea
`cashflow-deploy-<version>.zip` en la raíz (ejemplo: `cashflow-deploy-1.38.39.zip`).
No necesita compilar por separado. En Windows utiliza PowerShell; Linux/macOS
requiere la utilidad `zip`. Conserva `/cashflow` y las opciones del apartado 3.1.

El ZIP contiene directamente `server/`, `public/` y la plantilla `web.config`:
no incluye una carpeta `.output` exterior, la API, scripts SQL ni archivos
privados `.env`. Incluye las dependencias compiladas del servidor; no necesita
instalarlas en la carpeta de destino. El ZIP generado no debe guardarse como
código fuente en el repositorio.

Para actualizar su servidor existente, detenga **solo** `FlujoEfectivoWeb`,
extraiga a una carpeta temporal nueva por versión y copie `server/` y `public/`:

```powershell
nssm stop FlujoEfectivoWeb
Expand-Archive -Path C:\transferencias\cashflow-deploy-1.38.39.zip -DestinationPath C:\transferencias\cashflow-1.38.39 -Force
xcopy C:\transferencias\cashflow-1.38.39\server C:\inetpub\FlujoEfectivoWeb\server /E /I /Y
xcopy C:\transferencias\cashflow-1.38.39\public C:\inetpub\FlujoEfectivoWeb\public /E /I /Y
nssm start FlujoEfectivoWeb
```

**No sobrescriba el `web.config` existente ni la configuración NSSM** de su
servidor ya publicado. La plantilla del ZIP es para instalaciones nuevas y
debe adaptarse a las reglas del sitio: en `apps.aplix.cr`, conserve la regla
`CashflowSubcarpeta` y la API existente; no instale las reglas generales de la
plantilla sobre el sitio compartido. Verifique la versión en `/cashflow`.
Este paquete actualiza solo la aplicación web; API y SQL se publican por separado
cuando una entrega los requiera.

**Alternativa manual anterior (sin ZIP, sigue disponible):**

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

## 4. Conexión automática con la API y verificación

Desde 1.38.32, producción usa `/api` del mismo dominio automáticamente.
En `https://apps.aplix.cr/cashflow` conecta con `https://apps.aplix.cr/api`.
No se guarda la dirección en el navegador; Ctrl+F5, modo privado o limpiar
los datos del sitio no requieren volver a digitarla. Se ignoran direcciones
antiguas guardadas en `flujo.apiUrl`.

1. Abra la aplicación (`http://SRV-APP` o `https://apps.aplix.cr/cashflow`).
2. Abra `https://apps.aplix.cr/api/salud` y confirme `estado: "ok"`.
   El ingreso no muestra controles de dirección en ningún modo. Desde 1.38.33,
   desarrollo también usa `/api` automáticamente; si ejecuta la web en localhost
   y la API en otro puerto, configure `VITE_API_URL=http://localhost:5080/api`
   en `.env.local` antes de iniciar la web. La API debe estar encendida y permitir
   el origen local. La demostración se elige con el interruptor del ingreso.
3. Inicie sesión con el usuario administrador creado por
   `02_datos_iniciales.sql` / `04_seguridad.sql` y cambie su contraseña.
4. Verifique: Tablero, Bancos, Parámetros (tipo de cambio) y creación de un
   usuario nuevo.
5. Las versiones de la aplicación y de la API se muestran al pie de la pantalla
   de inicio de sesión y en **Parámetros → Integración**.

### 4.1 Reglas que debe cumplir la dirección

Si la API está en otro dominio o puerto, defina `VITE_API_URL` en `.env.production`
de la máquina de compilación (por ejemplo `VITE_API_URL=https://api.suempresa.com/api`)
y vuelva a ejecutar `npm run build:node`. Vite incorpora ese valor al compilar:
no es una variable que se pueda cambiar solo reiniciando NSSM. Para el despliegue
habitual en apps.aplix.cr, deje la variable sin definir (quite cualquier valor
antiguo de `.env` o `.env.production`). Esta dirección es pública, no una credencial.
Esto resuelve la conexión, pero no implementa aislamiento multitenant.

| Situación | Dirección del despliegue | Requisito |
| --- | --- | --- |
| API en su propio puerto | `VITE_API_URL=http://SRV-APP:5080/api` | Configurar al compilar y abrir el puerto |
| API como aplicación virtual del mismo sitio | `https://apps.aplix.cr/api` | Regla `Api` con `<action type="None" />` antes del proxy |
| Aplicación publicada en HTTPS | **La API también debe ser HTTPS** | El navegador bloquea llamadas HTTP desde una página HTTPS |

- **CORS**: en `appsettings.Production.json` de la API, `Cors:Origenes` debe
  incluir la dirección exacta desde la que los usuarios abren la aplicación
  (por ejemplo `https://apps.aplix.cr`), sin barra final. Reinicie el grupo de
  aplicaciones de la API tras cambiarla.
- **Comprobación**: abra `https://apps.aplix.cr/api/salud` en el navegador; debe
  devolver un JSON con `"estado": "ok"`. La aplicación usará esa dirección automáticamente.

> Si publica la API como aplicación virtual `/api` dentro del sitio web
> (IIS Manager → clic derecho en el sitio → *Agregar aplicación*, alias `api`,
> ruta `C:\inetpub\FlujoEfectivoApi`, grupo `FlujoEfectivoApi`), agregue en el
> `web.config` del sitio, **antes** de la regla de proxy:
> `<rule name="Api" stopProcessing="true"><match url="^api/.*" /><action type="None" /></rule>`
> para que IIS no reenvíe `/api` al proceso Node.


---

## 5. HTTPS (recomendado)

1. IIS Manager → nodo del servidor → *Certificados de servidor* → importar el certificado (.pfx) o solicitar uno.
2. En cada sitio → *Enlaces* → agregar `https` con el certificado.
3. Actualice `Cors:Origenes` en `appsettings.Production.json` con la URL `https://...` y reinicie el grupo de aplicaciones de la API.
4. Si la API está en otro origen, use su URL `https` en `VITE_API_URL` al compilar.

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
| Web: "Unexpected token '<' … not valid JSON" | URL de la API apunta al sitio web, no a la API | Usar `http://SRV-APP:5080/api` |
| Web: error de CORS en consola (F12) | Origen no está en `Cors:Origenes` | Agregar la URL exacta y reiniciar el grupo de la API |
| Web: 502.3 / 404 al abrir | Servicio Node detenido o proxy ARR no habilitado | `nssm status FlujoEfectivoWeb`, paso 0.4 |
| Web: refrescar `/facturas` da 404 | `web.config` no está en la raíz del sitio | Copiar `public\web.config` |
| Web: sin estilos y 404 en `/cashflow/assets/*` | Se compiló sin la ruta base | Compilar con `ruta-base.txt` = `/cashflow` (debe leerse `[vite] Ruta base de la aplicación: /cashflow`), copiar toda `.output` y reiniciar el servicio |
| Web: "Mixed Content" o la API no responde en HTTPS | `VITE_API_URL` apunta a HTTP desde HTTPS | Corregir la variable a HTTPS al compilar o quitarla para usar `/api` del mismo origen |
| Web: API no detectada | `/api/salud` no responde o el proxy captura `/api` | Verificar `/api/salud` y que IIS no lo reenvíe a Node |

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

## Fase 2: agente local (1.38.44)

1. Ejecute `database/19_agente_estado.sql` (requiere el 18).
2. Publique la API 1.38.44 y la aplicación web.
3. En **Parámetros → Agente local**, pulse **Generar token** (administrador) y cópielo; solo se muestra una vez.
4. En su equipo: `npm run package:agente` compila el agente autocontenido para Windows (no requiere .NET en el servidor del cliente) y genera `cashflow-agente-<versión>.zip` en la raíz del proyecto. Copie el contenido del ZIP a la carpeta del agente (p. ej. `C:\AplixAgente`) y edite `appsettings.json` (`ApiUrl`, `Token`, cadena `Softland`). Si la carpeta ya tiene un `appsettings.json` configurado, consérvelo. Para publicar sin ZIP use `npm run build:agente` (genera `publicar/agente`).
5. Pruebe en consola: `AplixCashFlowAgente.exe`. Como servicio:
   `sc.exe create AplixCashFlowAgente binPath= "C:\AplixAgente\AplixCashFlowAgente.exe" start= auto` y `sc.exe start AplixCashFlowAgente`.
6. Validación: en Parámetros debe verse «Agente en línea» y «Conexión a Softland verificada». Solo usa HTTPS saliente (443); no abra puertos.

## Fase 3 piloto: Pedidos (1.38.48)

1. Ejecute `database/20_replica_pedidos.sql` después de los scripts 18 y 19. El modo inicial de todas las compañías es directa; no se altera Softland.
2. Genere y despliegue los ZIP de aplicación y API (`npm run package:node`, `npm run package:api`). Detenga el servicio web y el AppPool correspondientes antes de copiar; conserve configuración de IIS y `appsettings*.json` de la API.
3. Genere `npm run package:agente`, detenga el agente del cliente y copie los binarios conservando su `appsettings.json`. Agregue dentro de `Agente` el mapeo local (reemplace ID y esquema con los reales):

```json
"Companias": [
  { "CompaniaId": 1, "Esquema": "ESQUEMA_SOFTLAND" }
]
```

La conexión es `Agente:Softland`; cada entrada puede incluir una cadena `Softland` distinta. Las credenciales permanecen en el servidor del cliente. El usuario SQL solo necesita SELECT; esta fase no escribe en Softland. Se exige HTTPS para transmitir el token.

4. Arranque el agente. En Parámetros → Agente local → Conexión ERP · Pedidos, seleccione compañía, intervalo y modo Agente. En Pedidos pulse Sincronizar ahora. La nube conserva el último conjunto íntegro ante errores; una instantánea exitosa vacía elimina los pedidos que ya no están pendientes.
5. Compare cantidad, moneda y montos con modo Directo **sin filtros diferentes y sin movimientos en el ERP entre lecturas**; abra también el detalle de un pedido. Puede regresar a Directa desde Parámetros. El modo directo usa la configuración Softland existente; no se añaden conexiones directas por empresa en esta fase.
6. La leyenda es verde con verificación exitosa reciente, y roja al alcanzar cinco minutos sin verificación o si falla. La sincronización y la verificación son fechas distintas: consultar el estado no modifica ninguna. En selección Todas se toma el estado más desfavorable y la fecha más antigua disponible.

**Alcance:** solo Pedidos y su detalle se replican. Facturas, cuentas por pagar, conciliación y escrituras siguen como antes; altas SaaS de otros inquilinos/usuarios quedan para la Fase 5. La instalación actual se mantiene vinculada a `principal`.

## Fase 3: Facturas y Contratos (1.38.50)

1. Ejecute `database/21_replica_documentos.sql` (requiere 18, 19 y 20).
2. Actualice web, API (su `web.config` permite envíos de hasta 100 MB del agente) y agente. No hay que cambiar `appsettings.json` del agente: usa el mismo mapeo `Agente:Companias`.
3. El modo Agente de cada compañía aplica a Pedidos, Facturas y Contratos a la vez. En cada ciclo el agente envía primero facturas y contratos y al final pedidos.
4. Valide comparando en modo Directo y Agente: cantidad de facturas, saldo pendiente total en USD y CRC, contratos activos del mes y su detalle.
5. Las líneas de facturas canceladas de más de 12 meses no se replican; su detalle indica consultar Softland.

**Validación local:** `dotnet run --project api/tests/ReplicaPedidos` prueba validación, normalización e identidad de réplicas sin cuentas reales; `bun test src/lib/estado-softland.test.ts` comprueba el límite exacto de cinco minutos. El ciclo real requiere el agente del cliente, IIS y su SQL Server.
