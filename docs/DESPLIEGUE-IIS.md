# Despliegue en un servidor IIS de Windows

Guía para descargar el código, compilarlo y publicarlo en IIS. La maqueta no
requiere base de datos para funcionar: todos los datos viven en memoria. Los
scripts de SQL Server (`database/`) son para la implementación definitiva.

## 1. Descargar el código

1. En Lovable, menú superior derecho → **GitHub → Connect to GitHub** y crear el
   repositorio; o **Download / Export** para bajar un ZIP del proyecto.
2. En el servidor (o en su máquina de compilación) descomprima el proyecto.

## 2. Requisitos en la máquina de compilación

- Node.js 20 LTS o superior (incluye npm).
- Opcional: Git.

```powershell
npm install
npm run build
```

La compilación deja la salida en `.output/` (servidor Node + archivos
estáticos en `.output/public`).

## 3. Requisitos en el servidor IIS

- Rol **Web Server (IIS)** instalado.
- Módulo **URL Rewrite** — https://www.iis.net/downloads/microsoft/url-rewrite
- Módulo **Application Request Routing (ARR)** — https://www.iis.net/downloads/microsoft/application-request-routing
  Tras instalarlo: IIS Manager → nodo del servidor → *Application Request
  Routing Cache* → *Server Proxy Settings* → marcar **Enable proxy**.
- Node.js 20 LTS instalado en el servidor.

## 4. Opción A (recomendada): IIS como proxy inverso hacia Node

1. Copie el contenido de `.output/` a, por ejemplo, `C:\inetpub\flujoefectivo`.
2. Copie también `web.config` (se genera dentro de `.output/public`) a la raíz
   del sitio en IIS. Su regla `ReverseProxy` ya apunta a `http://localhost:3000`.
3. Ejecute el servidor Node como servicio de Windows para que arranque solo.
   Con [NSSM](https://nssm.cc/):

   ```powershell
   nssm install FlujoEfectivo "C:\Program Files\nodejs\node.exe" "C:\inetpub\flujoefectivo\server\index.mjs"
   nssm set FlujoEfectivo AppDirectory C:\inetpub\flujoefectivo
   nssm set FlujoEfectivo AppEnvironmentExtra PORT=3000 NODE_ENV=production
   nssm start FlujoEfectivo
   ```

   (El nombre exacto del archivo de entrada puede variar; use el `.mjs` que
   aparezca dentro de `.output/server`.)
4. En IIS Manager cree un sitio nuevo apuntando a la carpeta con el
   `web.config`, asigne el puerto/enlace y el grupo de aplicaciones en modo
   **No Managed Code**.
5. Verifique en `http://localhost` que el tablero cargue.

## 5. Opción B: publicar solo el cliente como sitio estático

Válida para demostraciones, ya que la maqueta no usa servidor.

1. Copie el contenido de `.output/public` a la carpeta del sitio en IIS.
2. Edite `web.config`: comente la regla `ReverseProxy` y descomente la regla
   `SPA` (ya viene preparada en el archivo).
3. Sin esa regla, al refrescar rutas como `/facturas` IIS devuelve 404.

## 6. HTTPS y dominio

- Instale el certificado en IIS (*Server Certificates*) y agregue un enlace
  HTTPS al sitio.
- Recomendado: regla adicional de redirección de HTTP a HTTPS.

## 7. Base de datos

Ejecute en SQL Server, en este orden:

| Script | Contenido |
| --- | --- |
| `database/01_esquema.sql` | Base de datos, tablas, índices, restricciones y vistas de cálculo |
| `database/02_datos_iniciales.sql` | Monedas, perfiles, compañías, cuentas bancarias, tipo de cambio y usuario administrador |
| `database/03_datos_demo.sql` | Datos de demostración (opcional, no usar en producción) |

Con SSMS: abrir cada archivo y ejecutar. Con línea de comandos:

```powershell
sqlcmd -S localhost -E -i database\01_esquema.sql
sqlcmd -S localhost -E -i database\02_datos_iniciales.sql
sqlcmd -S localhost -E -i database\03_datos_demo.sql
```

Cadena de conexión de ejemplo para la aplicación definitiva:

```
Server=localhost;Database=FlujoEfectivo;Trusted_Connection=True;TrustServerCertificate=True;
```

## 8. Nota importante

Esta versión es la maqueta funcional en React: los datos se reinician al
recargar la página. La estructura de base de datos entregada corresponde al
sistema definitivo (Blazor Server + SQL Server según el ERS) y ya refleja
todas las reglas validadas en la maqueta: vencimientos calculados, pagos en
moneda distinta a la factura, saldos separados por moneda, contratos con
estado, pedidos independientes y bitácora de auditoría.
