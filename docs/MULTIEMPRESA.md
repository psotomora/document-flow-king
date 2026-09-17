# Modo multiempresa (SaaS) — versión 1.38.0

Una sola instalación (por ejemplo, una VM en Azure) puede atender a varias
empresas. **Cada empresa tiene su propia base de datos**; nada se comparte y
ninguna empresa puede ver ni enterarse de la existencia de las demás.

## Cómo funciona

```text
                 +---------------------------+
  Navegador  --> |  Web (IIS) + API .NET     |
  (código de     +-------------+-------------+
   empresa)                    |
                    FlujoEfectivoCatalogo      (solo dice dónde está cada base)
                               |
             +-----------------+------------------+
             |                 |                  |
     FlujoEfectivo_A   FlujoEfectivo_B     FlujoEfectivo_C   (datos de cada empresa)
```

- La persona escribe su **Código de empresa** en la pantalla de ingreso
  (queda recordado en su navegador). No hay lista desplegable ni servicio
  que devuelva los códigos existentes.
- Si el código no existe, está inactivo o el usuario no pertenece a esa
  empresa, el mensaje siempre es el mismo: **"Datos de acceso incorrectos."**
- El token de la sesión lleva la empresa; a partir de ahí toda consulta va a
  la base de esa empresa. El aislamiento está en la conexión, no en filtros.

## Instalación del catálogo

1. Ejecute `database/tenant/00_catalogo.sql` (o deje que la API lo cree sola
   al iniciar).
2. Opcional: en `appsettings.Production.json` puede indicar
   `"ConnectionStrings:Catalogo"`. Si no lo indica, se deriva de la conexión
   `FlujoEfectivo` cambiando la base a `FlujoEfectivoCatalogo`.
3. Si ya tenía una instalación de una sola empresa, al iniciar se registra
   automáticamente con el código `PRINCIPAL`.

## Alta de una empresa (paso a paso)

1. Ingrese con el código reservado **APLIX** y un usuario de la tabla
   `catalogo.UsuarioAplix` (personal de Aplix, perfil superadmin).
2. Menú **Aplix → Empresas atendidas → Nueva empresa**: código, nombre,
   servidor SQL, base de datos, usuario y contraseña SQL (se guarda cifrada).
3. Botón **Probar**: confirma que la conexión funciona.
4. Botón **Preparar base**: crea la base si falta y aplica los scripts de
   `database/` (plantilla de cliente, sin los datos de demostración).
5. Entregue al cliente su **código de empresa** y las credenciales del
   usuario administrador inicial.

Para que "Preparar base" funcione, copie la carpeta `database` junto al
ejecutable de la API o indique la ruta en `Scripts:Carpeta`.

## Fuente externa (ERP) por empresa

Los parámetros de conexión al SQL del ERP viven **dentro de la base de cada
empresa**, así que cada cliente configura su propio servidor externo desde
Parámetros. El servidor del ERP debe ser alcanzable desde la VM (IP pública
restringida a la IP de la VM, VPN o Private Link), con cifrado activado y un
usuario SQL de solo lectura.

## Notas de seguridad

- Ningún servicio anónimo devuelve la lista de empresas; `GET /api/salud`
  responde sin nombrarlas.
- `GET /api/admin/clientes` y el resto de la consola están reservados al
  perfil superadmin.
- Los intentos fallidos de ingreso responden siempre con el mismo mensaje y
  el mismo tiempo de respuesta, para no revelar qué códigos existen.
