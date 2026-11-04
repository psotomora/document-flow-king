/* Aplix Cash Flow Insights 1.38.70 - Sesión única por usuario.
   SesionId identifica la sesión abierta; UltimaActividad se renueva mientras la
   aplicación está abierta. Una sesión sin actividad en 3 minutos se considera cerrada. */
IF COL_LENGTH('flujo.Usuario', 'SesionId') IS NULL
    ALTER TABLE flujo.Usuario ADD SesionId UNIQUEIDENTIFIER NULL;
GO
IF COL_LENGTH('flujo.Usuario', 'UltimaActividad') IS NULL
    ALTER TABLE flujo.Usuario ADD UltimaActividad DATETIME2 NULL;
GO
