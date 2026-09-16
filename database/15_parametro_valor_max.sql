/* ===================================================================
   15_parametro_valor_max.sql
   Amplía flujo.Parametro.Valor a NVARCHAR(MAX) para poder guardar
   valores largos, como la llave pública de licencias.
   Es idempotente y conserva la nulabilidad actual de la columna.
   =================================================================== */
USE FlujoEfectivo;
GO

DECLARE @longitud INT, @admiteNulos BIT, @sql NVARCHAR(MAX);

SELECT @longitud = c.max_length, @admiteNulos = c.is_nullable
FROM sys.columns c
WHERE c.object_id = OBJECT_ID('flujo.Parametro') AND c.name = 'Valor';

IF @longitud IS NOT NULL AND @longitud <> -1
BEGIN
    SET @sql = 'ALTER TABLE flujo.Parametro ALTER COLUMN Valor NVARCHAR(MAX) '
             + CASE WHEN @admiteNulos = 1 THEN 'NULL' ELSE 'NOT NULL' END + ';';
    EXEC sys.sp_executesql @sql;
    PRINT 'flujo.Parametro.Valor ampliado a NVARCHAR(MAX).';
END
ELSE
    PRINT 'flujo.Parametro.Valor ya es NVARCHAR(MAX); sin cambios.';
GO
