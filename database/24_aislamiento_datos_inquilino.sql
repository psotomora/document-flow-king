/* ============================================================================
   Aplix Cash Flow Insights - Fase 5 (paso 2): aislamiento de datos por empresa.
   Script idempotente. Requiere 23_saas_multi_inquilino.sql.
   - Cada compañía pertenece a una empresa (inquilino). Las existentes quedan
     en 'principal'. Bancos, facturas, pagos, erogaciones, contratos, pedidos,
     documentos y transferencias heredan la empresa a través de su compañía.
   ============================================================================ */

IF COL_LENGTH('flujo.Compania', 'InquilinoId') IS NULL
BEGIN
    DECLARE @principal INT = (SELECT InquilinoId FROM flujo.Inquilino WHERE Codigo = 'principal');
    DECLARE @sql NVARCHAR(400) = N'ALTER TABLE flujo.Compania ADD InquilinoId INT NOT NULL
        CONSTRAINT DF_Compania_Inquilino DEFAULT (' + CAST(@principal AS NVARCHAR(10)) + N')
        CONSTRAINT FK_Compania_Inquilino REFERENCES flujo.Inquilino(InquilinoId);';
    EXEC (@sql);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Compania_Inquilino')
    CREATE INDEX IX_Compania_Inquilino ON flujo.Compania (InquilinoId, Activo);
GO

-- Para asignar una compañía a otra empresa:
-- UPDATE flujo.Compania SET InquilinoId = (SELECT InquilinoId FROM flujo.Inquilino WHERE Codigo = 'cliente-demo')
-- WHERE Codigo = 'XYZ';
