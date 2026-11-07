-- 1.38.81: los bancos pueden repetir el número de transferencia (lotes, cargos desglosados).
-- Se retira la unicidad estricta; la aplicación advierte y sugiere sufijo (-2, -3...).
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_Erogacion_Transf')
    ALTER TABLE flujo.Erogacion DROP CONSTRAINT UQ_Erogacion_Transf;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Erogacion_Transf' AND object_id = OBJECT_ID('flujo.Erogacion'))
    CREATE INDEX IX_Erogacion_Transf ON flujo.Erogacion (CompaniaId, NumeroTransferencia);
GO
