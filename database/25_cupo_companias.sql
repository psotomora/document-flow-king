/* Aplix Cash Flow Insights 1.38.69 - Cupo de compañías por empresa.
   NULL = sin límite (principal). Las empresas secundarias existentes reciben
   como cupo las compañías que ya tienen registradas (mínimo 1). */
IF COL_LENGTH('flujo.Inquilino', 'MaxCompanias') IS NULL
    ALTER TABLE flujo.Inquilino ADD MaxCompanias INT NULL;
GO
UPDATE i SET MaxCompanias = CASE WHEN n.Total < 1 THEN 1 ELSE n.Total END
FROM flujo.Inquilino i
CROSS APPLY (SELECT COUNT(*) AS Total FROM flujo.Compania c WHERE c.InquilinoId = i.InquilinoId) n
WHERE i.Codigo <> 'principal' AND i.MaxCompanias IS NULL;
GO
