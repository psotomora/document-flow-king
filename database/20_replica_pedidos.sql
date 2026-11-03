/* Fase 3 piloto: Pedidos. Requiere scripts 18 y 19. Idempotente.
   Sin cambios en Softland. Todas las compañías existentes pertenecen a principal;
   el alta de otro inquilino y sus usuarios se reserva a la Fase 5. */
IF OBJECT_ID('flujo.ConexionErpCompania','U') IS NULL
BEGIN
    CREATE TABLE flujo.ConexionErpCompania (
        CompaniaId INT NOT NULL CONSTRAINT PK_ConexionErpCompania PRIMARY KEY
            CONSTRAINT FK_ConexionErpCompania_Compania REFERENCES flujo.Compania(CompaniaId),
        InquilinoId INT NOT NULL CONSTRAINT FK_ConexionErpCompania_Inquilino REFERENCES flujo.Inquilino(InquilinoId),
        Modo NVARCHAR(10) NOT NULL CONSTRAINT DF_ConexionErpCompania_Modo DEFAULT 'directa'
            CONSTRAINT CK_ConexionErpCompania_Modo CHECK (Modo IN ('directa','agente')),
        IntervaloMinutos INT NOT NULL CONSTRAINT DF_ConexionErpCompania_Intervalo DEFAULT 5
            CONSTRAINT CK_ConexionErpCompania_Intervalo CHECK (IntervaloMinutos BETWEEN 1 AND 1440),
        TrabajoId UNIQUEIDENTIFIER NULL,
        TrabajoEn DATETIME2(3) NULL,
        SolicitudAtendida DATETIME2(0) NULL
    );
END;
GO
INSERT INTO flujo.ConexionErpCompania (CompaniaId, InquilinoId)
SELECT c.CompaniaId, i.InquilinoId FROM flujo.Compania c
CROSS JOIN flujo.Inquilino i WHERE i.Codigo='principal'
AND NOT EXISTS (SELECT 1 FROM flujo.ConexionErpCompania x WHERE x.CompaniaId=c.CompaniaId);
GO
IF OBJECT_ID('flujo.ReplicaPedidos','U') IS NULL
BEGIN
    CREATE TABLE flujo.ReplicaPedidos (
        InquilinoId INT NOT NULL CONSTRAINT FK_ReplicaPedidos_Inquilino REFERENCES flujo.Inquilino(InquilinoId),
        CompaniaId INT NOT NULL CONSTRAINT FK_ReplicaPedidos_Compania REFERENCES flujo.Compania(CompaniaId),
        Datos NVARCHAR(MAX) NOT NULL CONSTRAINT CK_ReplicaPedidos_Json CHECK (ISJSON(Datos)=1),
        RecibidoEn DATETIME2(3) NOT NULL,
        CONSTRAINT PK_ReplicaPedidos PRIMARY KEY (InquilinoId, CompaniaId)
    );
END;
GO
IF COL_LENGTH('flujo.SincronizacionEstado','UltimaVerificacion') IS NULL
    ALTER TABLE flujo.SincronizacionEstado ADD UltimaVerificacion DATETIME2(3) NULL;
GO