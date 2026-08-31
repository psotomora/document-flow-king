/* ===================================================================
   05_parametros.sql
   Tipo de cambio como parámetro persistente con motivo del cambio.
   Ejecutar después de 01_esquema.sql. Es idempotente.
   =================================================================== */
USE FlujoEfectivo;
GO

/* Columna de motivo/nota para cada actualización del parámetro */
IF COL_LENGTH('flujo.TipoCambio', 'Nota') IS NULL
    ALTER TABLE flujo.TipoCambio ADD Nota NVARCHAR(200) NULL;
GO

/* Vista con el tipo de cambio vigente (último registrado) */
IF OBJECT_ID('flujo.vw_TipoCambioVigente') IS NOT NULL
    DROP VIEW flujo.vw_TipoCambioVigente;
GO
CREATE VIEW flujo.vw_TipoCambioVigente
AS
SELECT TOP 1
       t.TipoCambioId,
       t.Valor,
       t.VigenteDesde,
       t.Nota,
       ISNULL(u.NombreCompleto, 'Sistema') AS Usuario
FROM flujo.TipoCambio t
LEFT JOIN flujo.Usuario u ON u.UsuarioId = t.UsuarioId
ORDER BY t.VigenteDesde DESC, t.TipoCambioId DESC;
GO
