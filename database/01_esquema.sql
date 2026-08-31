/* =====================================================================
   Sistema de Control de Flujo de Efectivo — Theronix / Aplix
   Script 1 de 3: creación de la base de datos y su estructura
   Motor: Microsoft SQL Server 2019 o superior
   Ejecutar con SQL Server Management Studio (SSMS) o sqlcmd.
   ===================================================================== */

IF DB_ID('FlujoEfectivo') IS NULL
BEGIN
    CREATE DATABASE FlujoEfectivo;
END
GO

USE FlujoEfectivo;
GO

/* ---------------------------------------------------------------
   Esquema de trabajo
   --------------------------------------------------------------- */
IF SCHEMA_ID('flujo') IS NULL EXEC('CREATE SCHEMA flujo');
GO

/* ---------------------------------------------------------------
   Catálogos base
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.Moneda') IS NULL
CREATE TABLE flujo.Moneda (
    Codigo        CHAR(3)        NOT NULL CONSTRAINT PK_Moneda PRIMARY KEY,  -- USD / CRC
    Nombre        NVARCHAR(50)   NOT NULL,
    Simbolo       NVARCHAR(5)    NOT NULL,
    Activo        BIT            NOT NULL CONSTRAINT DF_Moneda_Activo DEFAULT (1)
);
GO

IF OBJECT_ID('flujo.Compania') IS NULL
CREATE TABLE flujo.Compania (
    CompaniaId    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Compania PRIMARY KEY,
    Codigo        NVARCHAR(10)   NOT NULL CONSTRAINT UQ_Compania_Codigo UNIQUE,   -- TX / AX
    Nombre        NVARCHAR(150)  NOT NULL,
    Activo        BIT            NOT NULL CONSTRAINT DF_Compania_Activo DEFAULT (1),
    CreadoEn      DATETIME2(0)   NOT NULL CONSTRAINT DF_Compania_CreadoEn DEFAULT (SYSUTCDATETIME())
);
GO

IF OBJECT_ID('flujo.CuentaBancaria') IS NULL
CREATE TABLE flujo.CuentaBancaria (
    CuentaBancariaId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_CuentaBancaria PRIMARY KEY,
    CompaniaId       INT           NOT NULL,
    Nombre           NVARCHAR(100) NOT NULL,          -- BAC TX, PROMERICA AX, ...
    NumeroCuenta     NVARCHAR(50)  NULL,
    SaldoInicialUSD  DECIMAL(19,2) NOT NULL CONSTRAINT DF_Cuenta_SIUSD DEFAULT (0),
    SaldoInicialCRC  DECIMAL(19,2) NOT NULL CONSTRAINT DF_Cuenta_SICRC DEFAULT (0),
    Activo           BIT           NOT NULL CONSTRAINT DF_Cuenta_Activo DEFAULT (1),
    CONSTRAINT FK_Cuenta_Compania FOREIGN KEY (CompaniaId) REFERENCES flujo.Compania(CompaniaId),
    CONSTRAINT UQ_Cuenta_Nombre UNIQUE (CompaniaId, Nombre)
);
GO

/* ---------------------------------------------------------------
   Seguridad: perfiles y usuarios
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.Perfil') IS NULL
CREATE TABLE flujo.Perfil (
    PerfilId   INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Perfil PRIMARY KEY,
    Codigo     NVARCHAR(20)  NOT NULL CONSTRAINT UQ_Perfil_Codigo UNIQUE,  -- administrador / registro / consulta
    Nombre     NVARCHAR(50)  NOT NULL,
    Descripcion NVARCHAR(200) NULL
);
GO

IF OBJECT_ID('flujo.Usuario') IS NULL
CREATE TABLE flujo.Usuario (
    UsuarioId     INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Usuario PRIMARY KEY,
    NombreUsuario NVARCHAR(80)  NOT NULL CONSTRAINT UQ_Usuario_Nombre UNIQUE,
    NombreCompleto NVARCHAR(150) NOT NULL,
    CorreoElectronico NVARCHAR(150) NULL,
    HashContrasena NVARCHAR(256) NULL,   -- ASP.NET Identity o hash propio
    PerfilId      INT           NOT NULL,
    Activo        BIT           NOT NULL CONSTRAINT DF_Usuario_Activo DEFAULT (1),
    CreadoEn      DATETIME2(0)  NOT NULL CONSTRAINT DF_Usuario_CreadoEn DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Usuario_Perfil FOREIGN KEY (PerfilId) REFERENCES flujo.Perfil(PerfilId)
);
GO

/* ---------------------------------------------------------------
   Parámetros: tipo de cambio con historial
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.TipoCambio') IS NULL
CREATE TABLE flujo.TipoCambio (
    TipoCambioId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_TipoCambio PRIMARY KEY,
    Valor        DECIMAL(12,4) NOT NULL,          -- colones por dólar
    VigenteDesde DATETIME2(0)  NOT NULL,
    UsuarioId    INT           NULL,
    Nota         NVARCHAR(200) NULL,           -- motivo del cambio (bitácora)
    CONSTRAINT FK_TipoCambio_Usuario FOREIGN KEY (UsuarioId) REFERENCES flujo.Usuario(UsuarioId),
    CONSTRAINT CK_TipoCambio_Valor CHECK (Valor > 0)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_TipoCambio_Vigencia')
CREATE INDEX IX_TipoCambio_Vigencia ON flujo.TipoCambio (VigenteDesde DESC);
GO

/* ---------------------------------------------------------------
   Facturas por cobrar
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.Cliente') IS NULL
CREATE TABLE flujo.Cliente (
    ClienteId  INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Cliente PRIMARY KEY,
    Nombre     NVARCHAR(150) NOT NULL CONSTRAINT UQ_Cliente_Nombre UNIQUE,
    Identificacion NVARCHAR(30) NULL,
    Activo     BIT NOT NULL CONSTRAINT DF_Cliente_Activo DEFAULT (1)
);
GO

IF OBJECT_ID('flujo.Factura') IS NULL
CREATE TABLE flujo.Factura (
    FacturaId    INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Factura PRIMARY KEY,
    CompaniaId   INT           NOT NULL,
    Numero       NVARCHAR(40)  NOT NULL,
    ClienteId    INT           NOT NULL,
    FechaEmision DATE          NOT NULL,
    PlazoDias    INT           NOT NULL CONSTRAINT DF_Factura_Plazo DEFAULT (30),
    Moneda       CHAR(3)       NOT NULL,
    Monto        DECIMAL(19,2) NOT NULL,
    Notas        NVARCHAR(500) NULL,
    Anulada      BIT           NOT NULL CONSTRAINT DF_Factura_Anulada DEFAULT (0),
    CreadoEn     DATETIME2(0)  NOT NULL CONSTRAINT DF_Factura_CreadoEn DEFAULT (SYSUTCDATETIME()),
    /* Columna calculada persistida: fecha de vencimiento = emisión + plazo */
    FechaVencimiento AS (DATEADD(DAY, PlazoDias, FechaEmision)) PERSISTED,
    CONSTRAINT FK_Factura_Compania FOREIGN KEY (CompaniaId) REFERENCES flujo.Compania(CompaniaId),
    CONSTRAINT FK_Factura_Cliente  FOREIGN KEY (ClienteId)  REFERENCES flujo.Cliente(ClienteId),
    CONSTRAINT FK_Factura_Moneda   FOREIGN KEY (Moneda)     REFERENCES flujo.Moneda(Codigo),
    CONSTRAINT UQ_Factura_Numero   UNIQUE (CompaniaId, Numero),
    CONSTRAINT CK_Factura_Monto    CHECK (Monto > 0),
    CONSTRAINT CK_Factura_Plazo    CHECK (PlazoDias >= 0)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Factura_Vencimiento')
CREATE INDEX IX_Factura_Vencimiento ON flujo.Factura (CompaniaId, FechaVencimiento) INCLUDE (Moneda, Monto);
GO

/* ---------------------------------------------------------------
   Pagos recibidos (permiten moneda distinta a la de la factura)
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.Pago') IS NULL
CREATE TABLE flujo.Pago (
    PagoId            INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Pago PRIMARY KEY,
    FacturaId         INT           NOT NULL,
    CuentaBancariaId  INT           NOT NULL,
    Fecha             DATE          NOT NULL,
    Moneda            CHAR(3)       NOT NULL,
    Monto             DECIMAL(19,2) NOT NULL,
    TipoCambioOperacion DECIMAL(12,4) NULL,   -- obligatorio si la moneda difiere de la factura
    Metodo            NVARCHAR(50)  NOT NULL,
    Referencia        NVARCHAR(80)  NULL,
    CreadoEn          DATETIME2(0)  NOT NULL CONSTRAINT DF_Pago_CreadoEn DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Pago_Factura FOREIGN KEY (FacturaId) REFERENCES flujo.Factura(FacturaId),
    CONSTRAINT FK_Pago_Cuenta  FOREIGN KEY (CuentaBancariaId) REFERENCES flujo.CuentaBancaria(CuentaBancariaId),
    CONSTRAINT FK_Pago_Moneda  FOREIGN KEY (Moneda) REFERENCES flujo.Moneda(Codigo),
    CONSTRAINT CK_Pago_Monto   CHECK (Monto > 0)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Pago_Factura')
CREATE INDEX IX_Pago_Factura ON flujo.Pago (FacturaId);
GO

/* ---------------------------------------------------------------
   Erogaciones (salidas de efectivo)
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.Proveedor') IS NULL
CREATE TABLE flujo.Proveedor (
    ProveedorId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Proveedor PRIMARY KEY,
    Nombre      NVARCHAR(150) NOT NULL CONSTRAINT UQ_Proveedor_Nombre UNIQUE,
    Activo      BIT NOT NULL CONSTRAINT DF_Proveedor_Activo DEFAULT (1)
);
GO

IF OBJECT_ID('flujo.Erogacion') IS NULL
CREATE TABLE flujo.Erogacion (
    ErogacionId        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Erogacion PRIMARY KEY,
    CompaniaId         INT           NOT NULL,
    CuentaBancariaId   INT           NOT NULL,
    NumeroTransferencia NVARCHAR(40) NOT NULL,
    ProveedorId        INT           NOT NULL,
    Fecha              DATE          NOT NULL,
    Moneda             CHAR(3)       NOT NULL,
    Monto              DECIMAL(19,2) NOT NULL,
    Notas              NVARCHAR(500) NULL,
    CreadoEn           DATETIME2(0)  NOT NULL CONSTRAINT DF_Erogacion_CreadoEn DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_Erogacion_Compania  FOREIGN KEY (CompaniaId) REFERENCES flujo.Compania(CompaniaId),
    CONSTRAINT FK_Erogacion_Cuenta    FOREIGN KEY (CuentaBancariaId) REFERENCES flujo.CuentaBancaria(CuentaBancariaId),
    CONSTRAINT FK_Erogacion_Proveedor FOREIGN KEY (ProveedorId) REFERENCES flujo.Proveedor(ProveedorId),
    CONSTRAINT FK_Erogacion_Moneda    FOREIGN KEY (Moneda) REFERENCES flujo.Moneda(Codigo),
    CONSTRAINT UQ_Erogacion_Transf    UNIQUE (CompaniaId, NumeroTransferencia),
    CONSTRAINT CK_Erogacion_Monto     CHECK (Monto > 0)
);
GO

/* ---------------------------------------------------------------
   Contratos e ingresos diferidos
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.Contrato') IS NULL
CREATE TABLE flujo.Contrato (
    ContratoId         INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Contrato PRIMARY KEY,
    CompaniaId         INT           NOT NULL,
    Numero             NVARCHAR(40)  NOT NULL,
    ClienteId          INT           NOT NULL,
    Periodicidad       NVARCHAR(20)  NOT NULL,   -- Mensual/Bimestral/Trimestral/Semestral/Anual
    ProximaFacturacion DATE          NOT NULL,
    PlazoDias          INT           NOT NULL,
    Moneda             CHAR(3)       NOT NULL,
    Monto              DECIMAL(19,2) NOT NULL,
    Facturado          BIT           NOT NULL CONSTRAINT DF_Contrato_Facturado DEFAULT (0),
    Estado             NVARCHAR(20)  NOT NULL CONSTRAINT DF_Contrato_Estado DEFAULT ('Activo'),
    Notas              NVARCHAR(500) NULL,
    CONSTRAINT FK_Contrato_Compania FOREIGN KEY (CompaniaId) REFERENCES flujo.Compania(CompaniaId),
    CONSTRAINT FK_Contrato_Cliente  FOREIGN KEY (ClienteId) REFERENCES flujo.Cliente(ClienteId),
    CONSTRAINT FK_Contrato_Moneda   FOREIGN KEY (Moneda) REFERENCES flujo.Moneda(Codigo),
    CONSTRAINT UQ_Contrato_Numero   UNIQUE (CompaniaId, Numero),
    CONSTRAINT CK_Contrato_Estado   CHECK (Estado IN ('Activo','Cancelado')),
    CONSTRAINT CK_Contrato_Period   CHECK (Periodicidad IN ('Mensual','Bimestral','Trimestral','Semestral','Anual'))
);
GO

/* ---------------------------------------------------------------
   Pedidos pendientes de facturar (independientes de los contratos)
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.Pedido') IS NULL
CREATE TABLE flujo.Pedido (
    PedidoId      INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Pedido PRIMARY KEY,
    CompaniaId    INT           NOT NULL,
    Numero        NVARCHAR(40)  NOT NULL,
    ClienteId     INT           NOT NULL,
    FechaCreacion DATE          NOT NULL,
    PlazoDias     INT           NOT NULL,
    Moneda        CHAR(3)       NOT NULL,
    Monto         DECIMAL(19,2) NOT NULL,
    Estado        NVARCHAR(20)  NOT NULL CONSTRAINT DF_Pedido_Estado DEFAULT ('Pendiente'),
    FacturaId     INT           NULL,   -- se llena cuando el pedido se factura
    CONSTRAINT FK_Pedido_Compania FOREIGN KEY (CompaniaId) REFERENCES flujo.Compania(CompaniaId),
    CONSTRAINT FK_Pedido_Cliente  FOREIGN KEY (ClienteId) REFERENCES flujo.Cliente(ClienteId),
    CONSTRAINT FK_Pedido_Moneda   FOREIGN KEY (Moneda) REFERENCES flujo.Moneda(Codigo),
    CONSTRAINT FK_Pedido_Factura  FOREIGN KEY (FacturaId) REFERENCES flujo.Factura(FacturaId),
    CONSTRAINT UQ_Pedido_Numero   UNIQUE (CompaniaId, Numero),
    CONSTRAINT CK_Pedido_Estado   CHECK (Estado IN ('Pendiente','Facturado','Anulado'))
);
GO

/* ---------------------------------------------------------------
   Bitácora de auditoría (solo lectura desde la aplicación)
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.Bitacora') IS NULL
CREATE TABLE flujo.Bitacora (
    BitacoraId    BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Bitacora PRIMARY KEY,
    FechaHora     DATETIME2(0)  NOT NULL CONSTRAINT DF_Bitacora_Fecha DEFAULT (SYSUTCDATETIME()),
    UsuarioId     INT           NULL,
    NombreUsuario NVARCHAR(150) NOT NULL,
    Modulo        NVARCHAR(50)  NOT NULL,
    Registro      NVARCHAR(100) NOT NULL,
    Operacion     NVARCHAR(20)  NOT NULL,
    ValorAnterior NVARCHAR(MAX) NULL,
    ValorNuevo    NVARCHAR(MAX) NULL,
    CONSTRAINT FK_Bitacora_Usuario FOREIGN KEY (UsuarioId) REFERENCES flujo.Usuario(UsuarioId),
    CONSTRAINT CK_Bitacora_Operacion CHECK (Operacion IN ('Creación','Modificación','Eliminación','Acceso','Exportación','Importación'))
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Bitacora_Fecha')
CREATE INDEX IX_Bitacora_Fecha ON flujo.Bitacora (FechaHora DESC);
GO

/* ---------------------------------------------------------------
   Vistas de cálculo (mismas reglas que la maqueta)
   --------------------------------------------------------------- */
IF OBJECT_ID('flujo.vw_FacturaEstado') IS NOT NULL DROP VIEW flujo.vw_FacturaEstado;
GO
CREATE VIEW flujo.vw_FacturaEstado
AS
SELECT
    f.FacturaId,
    f.CompaniaId,
    f.Numero,
    c.Nombre               AS Cliente,
    f.FechaEmision,
    f.PlazoDias,
    f.FechaVencimiento,
    DATEDIFF(DAY, CAST(GETDATE() AS DATE), f.FechaVencimiento) AS DiasParaVencer,
    f.Moneda,
    f.Monto,
    ISNULL(pg.TotalPagado, 0) AS TotalPagado,
    f.Monto - ISNULL(pg.TotalPagado, 0) AS SaldoPendiente,
    CASE
        WHEN f.Monto - ISNULL(pg.TotalPagado, 0) <= 0.005 THEN 'Pagada'
        WHEN f.FechaVencimiento < CAST(GETDATE() AS DATE) THEN 'Vencida'
        ELSE 'Pendiente'
    END AS Estado
FROM flujo.Factura f
INNER JOIN flujo.Cliente c ON c.ClienteId = f.ClienteId
OUTER APPLY (
    /* Convierte el pago a la moneda de la factura usando el tipo de cambio de la operación */
    SELECT SUM(
        CASE
            WHEN p.Moneda = f.Moneda THEN p.Monto
            WHEN p.Moneda = 'CRC' AND f.Moneda = 'USD' THEN p.Monto / NULLIF(p.TipoCambioOperacion, 0)
            WHEN p.Moneda = 'USD' AND f.Moneda = 'CRC' THEN p.Monto * ISNULL(p.TipoCambioOperacion, 0)
        END) AS TotalPagado
    FROM flujo.Pago p
    WHERE p.FacturaId = f.FacturaId
) pg
WHERE f.Anulada = 0;
GO

IF OBJECT_ID('flujo.vw_SaldoPorBanco') IS NOT NULL DROP VIEW flujo.vw_SaldoPorBanco;
GO
CREATE VIEW flujo.vw_SaldoPorBanco
AS
SELECT
    cb.CuentaBancariaId,
    cb.CompaniaId,
    cb.Nombre,
    m.Codigo AS Moneda,
    CASE WHEN m.Codigo = 'USD' THEN cb.SaldoInicialUSD ELSE cb.SaldoInicialCRC END AS SaldoInicial,
    ISNULL(pg.Ingresos, 0)   AS Ingresos,
    ISNULL(er.Egresos, 0)    AS Egresos,
    CASE WHEN m.Codigo = 'USD' THEN cb.SaldoInicialUSD ELSE cb.SaldoInicialCRC END
        + ISNULL(pg.Ingresos, 0) - ISNULL(er.Egresos, 0) AS SaldoDisponible
FROM flujo.CuentaBancaria cb
CROSS JOIN flujo.Moneda m
OUTER APPLY (SELECT SUM(p.Monto) AS Ingresos FROM flujo.Pago p
             WHERE p.CuentaBancariaId = cb.CuentaBancariaId AND p.Moneda = m.Codigo) pg
OUTER APPLY (SELECT SUM(e.Monto) AS Egresos FROM flujo.Erogacion e
             WHERE e.CuentaBancariaId = cb.CuentaBancariaId AND e.Moneda = m.Codigo) er
WHERE cb.Activo = 1;
GO

IF OBJECT_ID('flujo.vw_ProyeccionPorTramo') IS NOT NULL DROP VIEW flujo.vw_ProyeccionPorTramo;
GO
CREATE VIEW flujo.vw_ProyeccionPorTramo
AS
SELECT
    CompaniaId,
    Moneda,
    Tramo,
    COUNT(*)          AS CantidadFacturas,
    SUM(SaldoPendiente) AS Monto
FROM (
    SELECT
        v.CompaniaId,
        v.Moneda,
        v.SaldoPendiente,
        CASE
            WHEN v.DiasParaVencer < 0  THEN 'Vencido sin cobrar'
            WHEN v.DiasParaVencer <= 7 THEN '0-7 días'
            WHEN v.DiasParaVencer <= 15 THEN '8-15 días'
            WHEN v.DiasParaVencer <= 30 THEN '16-30 días'
            WHEN v.DiasParaVencer <= 60 THEN '31-60 días'
            ELSE 'Más de 60 días'
        END AS Tramo
    FROM flujo.vw_FacturaEstado v
    WHERE v.Estado <> 'Pagada'
) t
GROUP BY CompaniaId, Moneda, Tramo;
GO

PRINT 'Estructura de la base de datos FlujoEfectivo creada correctamente.';
GO
