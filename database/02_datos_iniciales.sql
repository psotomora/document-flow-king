/* =====================================================================
   Script 2 de 3: datos iniciales (catálogos y usuarios base)
   Ejecutar después de 01_esquema.sql
   ===================================================================== */

USE FlujoEfectivo;
GO

/* Monedas */
MERGE flujo.Moneda AS destino
USING (VALUES ('USD', N'Dólares', N'$'), ('CRC', N'Colones', N'₡')) AS origen(Codigo, Nombre, Simbolo)
ON destino.Codigo = origen.Codigo
WHEN NOT MATCHED THEN INSERT (Codigo, Nombre, Simbolo) VALUES (origen.Codigo, origen.Nombre, origen.Simbolo);
GO

/* Perfiles */
MERGE flujo.Perfil AS destino
USING (VALUES
    ('administrador', N'Administrador', N'Acceso total: catálogos, parámetros, registros y reportes.'),
    ('registro',      N'Registro',      N'Registra facturas, pagos, erogaciones, contratos y pedidos.'),
    ('consulta',      N'Consulta',      N'Solo lectura de listados, tablero y reportes.')
) AS origen(Codigo, Nombre, Descripcion)
ON destino.Codigo = origen.Codigo
WHEN NOT MATCHED THEN INSERT (Codigo, Nombre, Descripcion) VALUES (origen.Codigo, origen.Nombre, origen.Descripcion);
GO

/* Compañías */
MERGE flujo.Compania AS destino
USING (VALUES ('TX', N'THERONIX, S. A.'), ('AX', N'APLIX')) AS origen(Codigo, Nombre)
ON destino.Codigo = origen.Codigo
WHEN NOT MATCHED THEN INSERT (Codigo, Nombre) VALUES (origen.Codigo, origen.Nombre);
GO

/* Cuentas bancarias con sus saldos iniciales */
MERGE flujo.CuentaBancaria AS destino
USING (VALUES
    ('TX', N'BAC TX',        42500.00,  8750000.00),
    ('TX', N'PROMERICA TX',  18300.00, 12400000.00),
    ('AX', N'BAC AX',        26750.00,  5320000.00),
    ('AX', N'PROMERICA AX',   9800.00,  3150000.00)
) AS origen(CodigoCompania, Nombre, SaldoUSD, SaldoCRC)
ON destino.Nombre = origen.Nombre
WHEN NOT MATCHED THEN
    INSERT (CompaniaId, Nombre, SaldoInicialUSD, SaldoInicialCRC)
    VALUES ((SELECT CompaniaId FROM flujo.Compania WHERE Codigo = origen.CodigoCompania),
            origen.Nombre, origen.SaldoUSD, origen.SaldoCRC);
GO

/* Tipo de cambio inicial (ajustar al valor vigente antes de salir a producción) */
IF NOT EXISTS (SELECT 1 FROM flujo.TipoCambio)
    INSERT INTO flujo.TipoCambio (Valor, VigenteDesde) VALUES (515.25, SYSUTCDATETIME());
GO

/* Usuario administrador inicial.
   La contraseña debe establecerla la aplicación (ASP.NET Identity) en el primer inicio. */
IF NOT EXISTS (SELECT 1 FROM flujo.Usuario WHERE NombreUsuario = N'admin')
    INSERT INTO flujo.Usuario (NombreUsuario, NombreCompleto, CorreoElectronico, PerfilId)
    SELECT N'admin', N'Administrador del sistema', N'admin@aplix.cr', PerfilId
    FROM flujo.Perfil WHERE Codigo = 'administrador';
GO

PRINT 'Datos iniciales cargados.';
GO
