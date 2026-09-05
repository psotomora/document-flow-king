# API .NET 8 + SQL Server — Guía de instalación

La aplicación web (React) se conecta a una API REST hecha en ASP.NET Core 8
que lee y escribe directamente en SQL Server (local o remoto).

```
Navegador ──▶ Sitio React (IIS)  ──HTTPS──▶  API .NET 8 (IIS)  ──▶  SQL Server
```

## 1. Base de datos

Ejecute los scripts en este orden desde SQL Server Management Studio:

1. `database/01_esquema.sql` — crea la base `FlujoEfectivo`, tablas y vistas.
2. `database/02_datos_iniciales.sql` — monedas, perfiles, compañías y bancos.
3. `database/03_datos_demo.sql` — *opcional*, datos de prueba.
4. `database/04_seguridad.sql` — usuarios de acceso.
5. `database/05_parametros.sql` — actualización persistente del tipo de cambio.
6. `database/06_parametros_generales.sql` — tabla `flujo.Parametro` (clave/valor) para parámetros generales como "Usar datos de pedidos de fuente externa". La API la crea automáticamente al iniciar si falta.

Usuarios creados (cambie las contraseñas después del primer ingreso):

| Usuario    | Contraseña     | Perfil        |
| ---------- | -------------- | ------------- |
| `admin`    | `Admin123*`    | Administrador |
| `registro` | `Registro123*` | Registro      |
| `consulta` | `Consulta123*` | Consulta      |

## 2. Configurar la API

Edite `api/FlujoEfectivo.Api/appsettings.json`:

- `ConnectionStrings:FlujoEfectivo`
  - Windows local: `Server=localhost;Database=FlujoEfectivo;Trusted_Connection=True;TrustServerCertificate=True;`
  - Servidor remoto con usuario SQL: `Server=10.0.0.5,1433;Database=FlujoEfectivo;User Id=flujo_app;Password=****;Encrypt=True;TrustServerCertificate=True;`
- `Jwt:Llave` — cadena secreta propia de **al menos 32 caracteres**.
- `Cors:Origenes` — la URL exacta del sitio web, por ejemplo `https://flujo.miempresa.com`.

## 3. Compilar y publicar la API

En el servidor (o en su equipo con .NET 8 SDK):

```bash
cd api/FlujoEfectivo.Api
dotnet restore
dotnet publish -c Release -o C:\inetpub\FlujoEfectivoApi
```

En IIS:

1. Instale el **ASP.NET Core 8 Hosting Bundle**.
2. Cree un sitio o aplicación apuntando a `C:\inetpub\FlujoEfectivoApi`.
3. En el grupo de aplicaciones seleccione **Sin código administrado**.
4. Si usa autenticación de Windows contra SQL Server, configure la identidad
   del grupo de aplicaciones con una cuenta con permisos en la base.

Verifique con `https://suservidor/api/salud` → debe responder `{"estado":"ok"}`.
Esta comprobación también valida que SQL Server sea accesible y que la estructura
de la base esté actualizada. Si devuelve un error 503, el mensaje indica si debe
revisar la cadena de conexión o ejecutar los scripts pendientes.

## 4. Conectar el sitio web

Antes de compilar el frontend, cree un archivo `.env` en la raíz del proyecto:

```
VITE_API_URL=https://suservidor/api
```

Luego `npm install` y `npm run build`. También puede indicarse la URL desde la
pantalla de inicio de sesión (opción **Configurar servidor**), útil para pruebas.

Si no se configura ninguna URL, la aplicación arranca en **modo demostración**
con datos en memoria.

## 5. Endpoints principales

| Método | Ruta                        | Descripción                              |
| ------ | --------------------------- | ---------------------------------------- |
| POST   | `/api/auth/login`           | Inicio de sesión, devuelve el token JWT   |
| POST   | `/api/auth/cambiar-contrasena` | Cambio de contraseña                  |
| GET    | `/api/estado`               | Carga completa de datos de la aplicación  |
| POST   | `/api/facturas`             | Registrar factura                         |
| DELETE | `/api/facturas/{id}`        | Eliminar factura y sus pagos              |
| POST   | `/api/pagos`                | Registrar pago (permite moneda cruzada)   |
| POST   | `/api/erogaciones`          | Registrar erogación                       |
| POST/PUT/DELETE | `/api/contratos`   | Gestión de contratos                      |
| POST/PUT/DELETE | `/api/pedidos`     | Gestión de pedidos                        |
| POST/PUT | `/api/bancos`             | Catálogo de cuentas (solo administrador)  |
| POST   | `/api/tipos-cambio`         | Registro del tipo de cambio               |
| POST   | `/api/importacion/lote`     | Carga inicial desde Excel                 |

Todas las operaciones quedan registradas en `flujo.Bitacora` con usuario,
fecha, módulo y valores anterior/nuevo.

## 6. Seguridad

- Contraseñas con PBKDF2-SHA256, 120 000 iteraciones y sal por usuario.
- Tokens JWT firmados con HMAC-SHA256, vigencia configurable (8 horas por defecto).
- Los perfiles se validan en el servidor: `consulta` no puede escribir y solo
  `administrador` modifica catálogos y tipo de cambio.
- Publique la API y el sitio bajo HTTPS con certificado válido.
