/* =====================================================================
   Catálogo multicliente (modo SaaS)
   ---------------------------------------------------------------------
   Crea la base FlujoEfectivoCatalogo, que solo guarda DÓNDE está la base
   de cada empresa. Ningún dato de negocio se comparte entre empresas: el
   aislamiento está en la conexión.

   La API ejecuta esto automáticamente al iniciar; el script se incluye
   para instalaciones manuales y es idempotente.
   ===================================================================== */

IF DB_ID('FlujoEfectivoCatalogo') IS NULL
    CREATE DATABASE FlujoEfectivoCatalogo;
GO

USE FlujoEfectivoCatalogo;
GO

IF SCHEMA_ID('catalogo') IS NULL
    EXEC('CREATE SCHEMA catalogo');
GO

IF OBJECT_ID('catalogo.Cliente', 'U') IS NULL
CREATE TABLE catalogo.Cliente
(
    ClienteId    INT IDENTITY(1,1) PRIMARY KEY,
    Codigo       NVARCHAR(30)  NOT NULL UNIQUE,   -- lo escribe la persona al ingresar
    Nombre       NVARCHAR(150) NOT NULL,
    Servidor     NVARCHAR(200) NOT NULL,
    BaseDatos    NVARCHAR(128) NOT NULL,
    Usuario      NVARCHAR(128) NOT NULL DEFAULT '',
    ClaveCifrada NVARCHAR(MAX) NOT NULL DEFAULT '',
    Encriptar    BIT           NOT NULL DEFAULT 1,
    Activo       BIT           NOT NULL DEFAULT 1,
    CreadoEn     DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* Usuarios del personal de Aplix (código reservado APLIX). No tienen
   acceso a los datos de ninguna empresa, solo a la consola de altas. */
IF OBJECT_ID('catalogo.UsuarioAplix', 'U') IS NULL
CREATE TABLE catalogo.UsuarioAplix
(
    UsuarioId      INT IDENTITY(1,1) PRIMARY KEY,
    NombreUsuario  NVARCHAR(80)  NOT NULL UNIQUE,
    NombreCompleto NVARCHAR(150) NOT NULL,
    HashContrasena NVARCHAR(400) NOT NULL,
    Activo         BIT           NOT NULL DEFAULT 1,
    CreadoEn       DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID('catalogo.Bitacora', 'U') IS NULL
CREATE TABLE catalogo.Bitacora
(
    BitacoraId INT IDENTITY(1,1) PRIMARY KEY,
    Usuario    NVARCHAR(80)  NOT NULL,
    Operacion  NVARCHAR(60)  NOT NULL,
    Registro   NVARCHAR(150) NOT NULL,
    Detalle    NVARCHAR(MAX) NULL,
    Fecha      DATETIME2(0)  NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* Ejemplo de alta manual (la contraseña se cifra desde la consola de Aplix,
   por eso se recomienda usar la pantalla "Empresas atendidas"):

INSERT INTO catalogo.Cliente (Codigo, Nombre, Servidor, BaseDatos, Usuario, ClaveCifrada)
VALUES ('DEMO', 'Empresa Demo', 'sql.midominio.com', 'FlujoEfectivoDemo', 'flujo_app', '');
*/
