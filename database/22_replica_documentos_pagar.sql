/* Fase 3: réplica de Documentos por pagar (DOCUMENTOS_CP) por agente. Requiere el script 21. Idempotente.
   Sin cambios en Softland; solo amplía las entidades admitidas en flujo.ReplicaErp. */
IF OBJECT_ID('flujo.ReplicaErp','U') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_ReplicaErp_Entidad' AND definition LIKE '%documentosPagar%')
BEGIN
    IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_ReplicaErp_Entidad')
        ALTER TABLE flujo.ReplicaErp DROP CONSTRAINT CK_ReplicaErp_Entidad;
    ALTER TABLE flujo.ReplicaErp ADD CONSTRAINT CK_ReplicaErp_Entidad
        CHECK (Entidad IN ('facturas','contratos','documentosPagar'));
END;
GO
