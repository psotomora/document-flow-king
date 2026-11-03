/* Fase 3: réplica de Facturas y Contratos por agente. Requiere scripts 18, 19 y 20. Idempotente.
   Sin cambios en Softland. Usa el mismo modo por compañía (directa/agente) de flujo.ConexionErpCompania. */
IF OBJECT_ID('flujo.ReplicaErp','U') IS NULL
BEGIN
    CREATE TABLE flujo.ReplicaErp (
        InquilinoId INT NOT NULL CONSTRAINT FK_ReplicaErp_Inquilino REFERENCES flujo.Inquilino(InquilinoId),
        CompaniaId INT NOT NULL CONSTRAINT FK_ReplicaErp_Compania REFERENCES flujo.Compania(CompaniaId),
        Entidad NVARCHAR(20) NOT NULL CONSTRAINT CK_ReplicaErp_Entidad CHECK (Entidad IN ('facturas','contratos')),
        Datos NVARCHAR(MAX) NOT NULL CONSTRAINT CK_ReplicaErp_Json CHECK (ISJSON(Datos)=1),
        RecibidoEn DATETIME2(3) NOT NULL,
        CONSTRAINT PK_ReplicaErp PRIMARY KEY (InquilinoId, CompaniaId, Entidad)
    );
END;
GO
