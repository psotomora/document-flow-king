/* ===================================================================
   11_contratos_externos.sql
   Parámetro para leer los contratos recurrentes desde la fuente
   externa (SoftlandERP: tablas CONTRATO y CONTRATO_LINEA).
   Ejecutar después de 06_parametros_generales.sql. Es idempotente.
   La API también lo crea automáticamente al iniciar si falta.
   =================================================================== */
USE FlujoEfectivo;
GO

IF NOT EXISTS (SELECT 1 FROM flujo.Parametro WHERE Clave = 'contratosFuenteExterna')
    INSERT INTO flujo.Parametro (Clave, Valor, Descripcion)
    VALUES ('contratosFuenteExterna', '0',
            'Usar datos de contratos recurrentes de fuente externa (SoftlandERP)');
GO
