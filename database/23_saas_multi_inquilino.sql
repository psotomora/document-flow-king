/* ============================================================================
   Aplix Cash Flow Insights - Fase 5 SaaS: empresas (inquilinos), cupo de
   usuarios y Súper Administrador. Script idempotente.
   - Todos los usuarios existentes quedan en el inquilino 'principal' (1).
   - 'principal' no tiene cupo propio (MaxUsuarios NULL): sigue rigiendo la
     licencia .lic, como hasta ahora.
   - Los administradores activos de 'principal' quedan como Súper Administrador.
   Requiere haber ejecutado 18_agente_sincronizacion.sql.
   ============================================================================ */

IF COL_LENGTH('flujo.Inquilino', 'MaxUsuarios') IS NULL
    ALTER TABLE flujo.Inquilino ADD MaxUsuarios INT NULL;   -- NULL = sin cupo propio
GO
IF COL_LENGTH('flujo.Inquilino', 'FechaVencimiento') IS NULL
    ALTER TABLE flujo.Inquilino ADD FechaVencimiento DATE NULL;
GO
IF COL_LENGTH('flujo.Inquilino', 'Contacto') IS NULL
    ALTER TABLE flujo.Inquilino ADD Contacto NVARCHAR(150) NULL;
GO
IF COL_LENGTH('flujo.Inquilino', 'Correo') IS NULL
    ALTER TABLE flujo.Inquilino ADD Correo NVARCHAR(200) NULL;
GO

IF COL_LENGTH('flujo.Usuario', 'InquilinoId') IS NULL
BEGIN
    DECLARE @principal INT = (SELECT InquilinoId FROM flujo.Inquilino WHERE Codigo = 'principal');
    DECLARE @sql NVARCHAR(400) = N'ALTER TABLE flujo.Usuario ADD InquilinoId INT NOT NULL
        CONSTRAINT DF_Usuario_Inquilino DEFAULT (' + CAST(@principal AS NVARCHAR(10)) + N')
        CONSTRAINT FK_Usuario_Inquilino REFERENCES flujo.Inquilino(InquilinoId);';
    EXEC (@sql);
END;
GO

IF COL_LENGTH('flujo.Usuario', 'SuperAdministrador') IS NULL
BEGIN
    ALTER TABLE flujo.Usuario ADD SuperAdministrador BIT NOT NULL
        CONSTRAINT DF_Usuario_SuperAdmin DEFAULT (0);
END;
GO

-- Primera ejecución: los administradores activos de la instalación principal
-- (Aplix) gestionan las empresas.
IF NOT EXISTS (SELECT 1 FROM flujo.Usuario WHERE SuperAdministrador = 1)
    UPDATE u SET SuperAdministrador = 1
    FROM flujo.Usuario u
    INNER JOIN flujo.Perfil p ON p.PerfilId = u.PerfilId
    INNER JOIN flujo.Inquilino i ON i.InquilinoId = u.InquilinoId
    WHERE p.Codigo = 'administrador' AND u.Activo = 1 AND i.Codigo = 'principal';
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Usuario_Inquilino')
    CREATE INDEX IX_Usuario_Inquilino ON flujo.Usuario (InquilinoId, Activo);
GO
