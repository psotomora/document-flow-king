/* =====================================================================
   Script 3 de 3: datos de demostración (opcional)
   Reproduce los datos de la maqueta. NO ejecutar en producción.
   Ejecutar después de 01_esquema.sql y 02_datos_iniciales.sql
   ===================================================================== */

USE FlujoEfectivo;
GO

/* Clientes */
MERGE flujo.Cliente AS d
USING (VALUES
    (N'Grupo Ferretero CR'), (N'Distribuidora del Valle'), (N'Corporación Santa Ana'),
    (N'Textiles Heredia'), (N'Inversiones Escazú'), (N'Farmacias Unidas'),
    (N'Transportes Pacífico'), (N'Hotelera Guanacaste'), (N'Agroindustrial Zarcero')
) AS o(Nombre) ON d.Nombre = o.Nombre
WHEN NOT MATCHED THEN INSERT (Nombre) VALUES (o.Nombre);
GO

/* Proveedores */
MERGE flujo.Proveedor AS d
USING (VALUES
    (N'Amazon Web Services'), (N'CCSS'), (N'Microsoft'), (N'Inmobiliaria Lindora'),
    (N'Kölbi Empresarial'), (N'JetBrains')
) AS o(Nombre) ON d.Nombre = o.Nombre
WHEN NOT MATCHED THEN INSERT (Nombre) VALUES (o.Nombre);
GO

/* Facturas */
IF NOT EXISTS (SELECT 1 FROM flujo.Factura)
INSERT INTO flujo.Factura (CompaniaId, Numero, ClienteId, FechaEmision, PlazoDias, Moneda, Monto, Notas)
SELECT c.CompaniaId, v.Numero, cl.ClienteId, v.FechaEmision, v.PlazoDias, v.Moneda, v.Monto, v.Notas
FROM (VALUES
    ('TX', N'TX-1001', N'Grupo Ferretero CR',     '2026-05-12', 30, 'USD',    18500.00, N'Licenciamiento anual'),
    ('TX', N'TX-1002', N'Distribuidora del Valle','2026-06-02', 45, 'CRC',  6350000.00, N'Soporte trimestral'),
    ('TX', N'TX-1003', N'Corporación Santa Ana',  '2026-07-08', 30, 'USD',     9750.00, NULL),
    ('TX', N'TX-1004', N'Grupo Ferretero CR',     '2026-07-22', 30, 'USD',     4200.00, N'Horas adicionales'),
    ('TX', N'TX-1005', N'Textiles Heredia',       '2026-08-05', 15, 'CRC',  2450000.00, NULL),
    ('TX', N'TX-1006', N'Corporación Santa Ana',  '2026-08-14', 30, 'USD',    12800.00, NULL),
    ('TX', N'TX-1007', N'Inversiones Escazú',     '2026-08-24', 45, 'CRC',  9800000.00, N'Proyecto de migración'),
    ('AX', N'AX-2001', N'Farmacias Unidas',       '2026-05-28', 30, 'USD',     7600.00, NULL),
    ('AX', N'AX-2002', N'Transportes Pacífico',   '2026-06-19', 60, 'CRC',  4100000.00, NULL),
    ('AX', N'AX-2003', N'Hotelera Guanacaste',    '2026-07-15', 30, 'USD',    15400.00, N'Implementación fase I'),
    ('AX', N'AX-2004', N'Farmacias Unidas',       '2026-08-10', 30, 'USD',     5250.00, NULL),
    ('AX', N'AX-2005', N'Agroindustrial Zarcero', '2026-08-20', 30, 'CRC',  3720000.00, NULL),
    ('AX', N'AX-2006', N'Transportes Pacífico',   '2026-08-27', 60, 'USD',    22300.00, N'Renovación de contrato'),
    ('AX', N'AX-2007', N'Hotelera Guanacaste',    '2026-04-16', 30, 'CRC',  5600000.00, N'Saldo en gestión de cobro')
) AS v(CodCia, Numero, Cliente, FechaEmision, PlazoDias, Moneda, Monto, Notas)
JOIN flujo.Compania c ON c.Codigo = v.CodCia
JOIN flujo.Cliente cl ON cl.Nombre = v.Cliente;
GO

/* Pagos */
IF NOT EXISTS (SELECT 1 FROM flujo.Pago)
INSERT INTO flujo.Pago (FacturaId, CuentaBancariaId, Fecha, Moneda, Monto, TipoCambioOperacion, Metodo, Referencia)
SELECT f.FacturaId, cb.CuentaBancariaId, v.Fecha, v.Moneda, v.Monto, v.TC, v.Metodo, v.Referencia
FROM (VALUES
    (N'TX-1001', N'BAC TX',       '2026-06-08', 'USD',    18500.00, NULL,   N'Transferencia', N'TRF-88412'),
    (N'TX-1002', N'PROMERICA TX', '2026-07-14', 'CRC',  3000000.00, NULL,   N'Transferencia', N'TRF-91120'),
    (N'TX-1003', N'BAC TX',       '2026-08-06', 'USD',     5000.00, NULL,   N'Transferencia', N'TRF-93055'),
    (N'TX-1004', N'BAC TX',       '2026-08-19', 'USD',     4200.00, NULL,   N'Cheque',        N'CHQ-2214'),
    (N'TX-1005', N'PROMERICA TX', '2026-08-18', 'CRC',  1200000.00, NULL,   N'Transferencia', N'TRF-93871'),
    (N'AX-2001', N'BAC AX',       '2026-06-24', 'USD',     7600.00, NULL,   N'Transferencia', N'TRF-89330'),
    (N'AX-2002', N'PROMERICA AX', '2026-08-11', 'CRC',  2050000.00, NULL,   N'Transferencia', N'TRF-93410'),
    (N'AX-2003', N'BAC AX',       '2026-08-21', 'CRC',  4000000.00, 515.25, N'Transferencia', N'TRF-93902'),
    (N'AX-2004', N'BAC AX',       '2026-08-26', 'USD',     2500.00, NULL,   N'Transferencia', N'TRF-94120'),
    (N'AX-2007', N'PROMERICA AX', '2026-06-02', 'CRC',  1600000.00, NULL,   N'Depósito',      N'DEP-5521')
) AS v(NumFactura, Banco, Fecha, Moneda, Monto, TC, Metodo, Referencia)
JOIN flujo.Factura f ON f.Numero = v.NumFactura
JOIN flujo.CuentaBancaria cb ON cb.Nombre = v.Banco;
GO

/* Erogaciones */
IF NOT EXISTS (SELECT 1 FROM flujo.Erogacion)
INSERT INTO flujo.Erogacion (CompaniaId, CuentaBancariaId, NumeroTransferencia, ProveedorId, Fecha, Moneda, Monto, Notas)
SELECT c.CompaniaId, cb.CuentaBancariaId, v.NumTransf, p.ProveedorId, v.Fecha, v.Moneda, v.Monto, v.Notas
FROM (VALUES
    ('TX', N'BAC TX',       N'TE-70021', N'Amazon Web Services',  '2026-07-05', 'USD',    3850.00, N'Infraestructura julio'),
    ('TX', N'PROMERICA TX', N'TE-70055', N'CCSS',                 '2026-07-31', 'CRC', 4250000.00, N'Cargas sociales'),
    ('TX', N'BAC TX',       N'TE-70108', N'Microsoft',            '2026-08-04', 'USD',    2140.00, NULL),
    ('TX', N'PROMERICA TX', N'TE-70143', N'Inmobiliaria Lindora', '2026-08-01', 'CRC', 1850000.00, N'Alquiler agosto'),
    ('AX', N'BAC AX',       N'TE-80014', N'Amazon Web Services',  '2026-08-05', 'USD',    1920.00, NULL),
    ('AX', N'PROMERICA AX', N'TE-80042', N'CCSS',                 '2026-08-01', 'CRC', 2980000.00, N'Cargas sociales'),
    ('AX', N'BAC AX',       N'TE-80077', N'Kölbi Empresarial',    '2026-08-12', 'CRC',  385000.00, N'Telecomunicaciones'),
    ('AX', N'BAC AX',       N'TE-80095', N'JetBrains',            '2026-08-22', 'USD',    1150.00, N'Licencias de desarrollo')
) AS v(CodCia, Banco, NumTransf, Proveedor, Fecha, Moneda, Monto, Notas)
JOIN flujo.Compania c ON c.Codigo = v.CodCia
JOIN flujo.CuentaBancaria cb ON cb.Nombre = v.Banco
JOIN flujo.Proveedor p ON p.Nombre = v.Proveedor;
GO

/* Contratos */
IF NOT EXISTS (SELECT 1 FROM flujo.Contrato)
INSERT INTO flujo.Contrato (CompaniaId, Numero, ClienteId, Periodicidad, ProximaFacturacion, PlazoDias, Moneda, Monto, Facturado, Estado, Notas)
SELECT c.CompaniaId, v.Numero, cl.ClienteId, v.Periodicidad, v.Proxima, v.PlazoDias, v.Moneda, v.Monto, v.Facturado, v.Estado, v.Notas
FROM (VALUES
    ('TX', N'CT-101', N'Grupo Ferretero CR',      N'Mensual',    '2026-09-01', 30, 'USD',    3200.00, 0, N'Activo',    N'Soporte mensual'),
    ('TX', N'CT-102', N'Distribuidora del Valle', N'Trimestral', '2026-10-01', 45, 'CRC', 2850000.00, 0, N'Activo',    NULL),
    ('AX', N'CT-201', N'Farmacias Unidas',        N'Mensual',    '2026-09-05', 30, 'USD',    1850.00, 1, N'Activo',    NULL),
    ('AX', N'CT-202', N'Hotelera Guanacaste',     N'Anual',      '2027-01-15', 60, 'USD',   24000.00, 0, N'Activo',    N'Mantenimiento anual'),
    ('AX', N'CT-203', N'Transportes Pacífico',    N'Semestral',  '2026-09-30', 30, 'CRC', 4600000.00, 0, N'Cancelado', N'Cancelado por el cliente')
) AS v(CodCia, Numero, Cliente, Periodicidad, Proxima, PlazoDias, Moneda, Monto, Facturado, Estado, Notas)
JOIN flujo.Compania c ON c.Codigo = v.CodCia
JOIN flujo.Cliente cl ON cl.Nombre = v.Cliente;
GO

/* Pedidos */
IF NOT EXISTS (SELECT 1 FROM flujo.Pedido)
INSERT INTO flujo.Pedido (CompaniaId, Numero, ClienteId, FechaCreacion, PlazoDias, Moneda, Monto, Estado)
SELECT c.CompaniaId, v.Numero, cl.ClienteId, v.Fecha, v.PlazoDias, v.Moneda, v.Monto, v.Estado
FROM (VALUES
    ('TX', N'PD-501', N'Corporación Santa Ana',  '2026-08-12', 30, 'USD',    8600.00, N'Pendiente'),
    ('TX', N'PD-502', N'Textiles Heredia',       '2026-08-20', 15, 'CRC', 1950000.00, N'En proceso'),
    ('AX', N'PD-601', N'Agroindustrial Zarcero', '2026-08-18', 30, 'USD',    5400.00, N'Pendiente'),
    ('AX', N'PD-602', N'Farmacias Unidas',       '2026-07-30', 30, 'CRC', 2300000.00, N'Facturado'),
    ('AX', N'PD-603', N'Inversiones Escazú',     '2026-08-25', 45, 'USD',   11200.00, N'Pendiente')
) AS v(CodCia, Numero, Cliente, Fecha, PlazoDias, Moneda, Monto, Estado)
JOIN flujo.Compania c ON c.Codigo = v.CodCia
JOIN flujo.Cliente cl ON cl.Nombre = v.Cliente;
GO

PRINT 'Datos de demostración cargados.';
GO
