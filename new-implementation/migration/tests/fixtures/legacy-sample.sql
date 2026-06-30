-- tests/fixtures/legacy-sample.sql
-- Synthetic data only — NO real customer PII.
-- Real legacy schema column names from bd_ex.sql.
-- All FOREIGN KEY constraints stripped; PRIMARY KEYs and real column names/types kept.
-- Load into pos_legacy schema.

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- Lookup: inventarios_listas  (needed by clientes.IdLista)
-- ============================================================
CREATE TABLE `inventarios_listas` (
  `IdLista`         int(11)      NOT NULL AUTO_INCREMENT,
  `NomLista`        varchar(100) NOT NULL,
  `EsActivo`        tinyint(4)   NOT NULL DEFAULT 1,
  `EsIvaIncluido`   tinyint(4)   NOT NULL DEFAULT 0,
  `EsImptoConsumo`  tinyint(4)   NOT NULL DEFAULT 0,
  `EsExtranjero`    tinyint(4)   NOT NULL DEFAULT 0,
  PRIMARY KEY (`IdLista`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `inventarios_listas`
  (`IdLista`, `NomLista`, `EsActivo`, `EsIvaIncluido`, `EsImptoConsumo`, `EsExtranjero`)
VALUES
  (1, 'Lista General', 1, 0, 0, 0);

-- ============================================================
-- Lookup: formaspago  (exercises cash and card heuristics)
-- ============================================================
CREATE TABLE `formaspago` (
  `IdFormaPago`  int(11)      NOT NULL,
  `NomFormaPago` varchar(100) NOT NULL,
  `EsActivo`     tinyint(4)   NOT NULL DEFAULT -1,
  PRIMARY KEY (`IdFormaPago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `formaspago`
  (`IdFormaPago`, `NomFormaPago`, `EsActivo`)
VALUES
  (1, 'Efectivo',            1),
  (2, 'Tarjeta de Credito',  1);

-- ============================================================
-- Map: empresas → companies  (single tenant row)
-- ============================================================
CREATE TABLE `empresas` (
  `IdEmpresa`      int(11)      NOT NULL AUTO_INCREMENT,
  `Nombre`         varchar(50)  NOT NULL,
  `Codigo`         varchar(50)  NOT NULL,
  `Nit`            varchar(50)  DEFAULT NULL,
  `DV`             int(11)      DEFAULT 0,
  `Direccion`      varchar(50)  DEFAULT NULL,
  `Telefono`       varchar(50)  DEFAULT NULL,
  `IdCiudad`       int(11)      DEFAULT NULL,
  `IdTipoRegimen`  int(11)      DEFAULT NULL,
  `PagWeb`         varchar(200) DEFAULT NULL,
  `Email`          varchar(200) DEFAULT NULL,
  `IdDpto`         int(11)      DEFAULT NULL,
  `EsActivo`       tinyint(4)   NOT NULL DEFAULT 1,
  `RepLegalNom1`   varchar(200) DEFAULT NULL,
  `RepLegalNom2`   varchar(200) DEFAULT NULL,
  `RepLegalApe1`   varchar(200) DEFAULT NULL,
  `RepLegalApe2`   varchar(200) DEFAULT NULL,
  `RepLegalDoc`    varchar(100) DEFAULT '0',
  PRIMARY KEY (`IdEmpresa`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `empresas`
  (`IdEmpresa`, `Nombre`, `Codigo`, `Nit`, `DV`,
   `Direccion`, `Telefono`, `IdCiudad`, `IdTipoRegimen`,
   `PagWeb`, `Email`, `IdDpto`, `EsActivo`,
   `RepLegalNom1`, `RepLegalNom2`, `RepLegalApe1`, `RepLegalApe2`, `RepLegalDoc`)
VALUES
  (1, 'Empresa Demo SAS', 'EMP001', '900123456-7', 7,
   'Calle 10 # 20-30', '6017001234', NULL, NULL,
   NULL, 'demo@empresademo.com', NULL, 1,
   NULL, NULL, NULL, NULL, '0');

-- ============================================================
-- Map: usuarios → users  (2 rows; IdUsuario=2 has NULL email)
-- ============================================================
CREATE TABLE `usuarios` (
  `IdUsuario`          int(11)      NOT NULL AUTO_INCREMENT,
  `NomUsuario`         varchar(100) NOT NULL,
  `Clave`              varchar(100) NOT NULL,
  `EsActivo`           tinyint(4)   NOT NULL DEFAULT 1,
  `CorreoElectronico`  varchar(200) DEFAULT NULL,
  `IdUsuarioTipo`      int(11)      NOT NULL DEFAULT 1,
  PRIMARY KEY (`IdUsuario`),
  UNIQUE KEY `XI_NomUsuario` (`NomUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `usuarios`
  (`IdUsuario`, `NomUsuario`, `Clave`, `EsActivo`, `CorreoElectronico`, `IdUsuarioTipo`)
VALUES
  (1, 'admin',     '$2b$10$demo_hash_admin_placeholder', 1, 'admin@empresa.com', 1),
  (2, 'vendedor1', '$2b$10$demo_hash_vend1_placeholder', 1, NULL,                1);

-- ============================================================
-- Map: clientes → customers
--   IdCliente=2 has NULL Email (exercises synth-email fallback)
--   IdCliente=3 has EsActivo=0 (exercises deleted_at transform)
-- ============================================================
CREATE TABLE `clientes` (
  `IdCliente`           int(11)       NOT NULL AUTO_INCREMENT,
  `IdTipoDoc`           int(11)       NOT NULL DEFAULT 1,
  `NumDoc`              varchar(100)  NOT NULL DEFAULT '0',
  `DVCliente`           int(11)       DEFAULT NULL,
  `IdCiudad`            int(11)       NOT NULL DEFAULT 18205,
  `IdDpto`              int(11)       NOT NULL DEFAULT 18,
  `Nombre1`             varchar(200)  NOT NULL DEFAULT '',
  `Nombre2`             varchar(200)  DEFAULT NULL,
  `Apellido1`           varchar(200)  DEFAULT NULL,
  `Apellido2`           varchar(200)  DEFAULT NULL,
  `RazonSocial`         varchar(300)  DEFAULT NULL,
  `Direccion`           varchar(45)   DEFAULT 'Sin direccion',
  `Telefono`            varchar(45)   DEFAULT 'No telefono',
  `Email`               varchar(100)  DEFAULT NULL,
  `EsActivo`            tinyint(4)    NOT NULL DEFAULT 1,
  `Nota`                varchar(200)  DEFAULT NULL,
  `IdTipoRegimen`       int(11)       NOT NULL DEFAULT 1,
  `IdAgrup1`            int(11)       NOT NULL DEFAULT 1,
  `CupoCreditoTiene`    tinyint(4)    NOT NULL DEFAULT 0,
  `CupoCreditoPlazo`    int(11)       DEFAULT 0,
  `CupoCreditoValor`    decimal(28,6) DEFAULT 0.000000,
  `IdLista`             int(11)       NOT NULL DEFAULT 1,
  `FechaCreacion`       datetime      DEFAULT '1000-01-01 00:00:00',
  `FechaUltModificacion` datetime     DEFAULT '1000-01-01 00:00:00',
  PRIMARY KEY (`IdCliente`),
  UNIQUE KEY `IdCliente_UNIQUE` (`IdCliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `clientes`
  (`IdCliente`, `IdTipoDoc`, `NumDoc`, `DVCliente`,
   `IdCiudad`, `IdDpto`, `Nombre1`, `Nombre2`, `Apellido1`, `Apellido2`, `RazonSocial`,
   `Direccion`, `Telefono`, `Email`, `EsActivo`, `Nota`,
   `IdTipoRegimen`, `IdAgrup1`, `CupoCreditoTiene`, `CupoCreditoPlazo`, `CupoCreditoValor`,
   `IdLista`, `FechaCreacion`, `FechaUltModificacion`)
VALUES
  (1, 1, '12345678',  NULL, 18205, 18, 'Juan',     NULL,    'Garcia', NULL, NULL,
   'Carrera 5 # 10-20', '3001234567', 'juan.garcia@ejemplo.com', 1, NULL,
   1, 1, 0, 0, 0.000000,
   1, '2023-01-15 10:00:00', '2023-01-15 10:00:00'),
  (2, 1, '87654321',  NULL, 18205, 18, 'Maria',    'Isabel', 'Lopez', NULL, NULL,
   'Calle 8 # 5-15',    '3109876543', NULL,                           1, NULL,
   1, 1, 0, 0, 0.000000,
   1, '2023-03-20 09:00:00', '2023-03-20 09:00:00'),
  (3, 2, '900555444', NULL, 18205, 18, 'Empresa',  NULL,    NULL,    NULL, 'Distribuidora XYZ SAS',
   'Av Industrial 100', '6012223333', 'empresa.xyz@test.com',          0, NULL,
   1, 1, 0, 0, 0.000000,
   1, '2022-06-10 08:00:00', '2022-06-10 08:00:00');

-- ============================================================
-- Map: inventarios → products  (3 rows, unique CodInventario)
-- ============================================================
CREATE TABLE `inventarios` (
  `IdInventario`         int(11)       NOT NULL AUTO_INCREMENT,
  `CodInventario`        varchar(50)   NOT NULL,
  `CodigoBarras`         varchar(15)   DEFAULT NULL,
  `NomInventario`        varchar(500)  NOT NULL,
  `EsActivo`             tinyint(4)    NOT NULL DEFAULT 1,
  `CantMaxima`           decimal(28,6) DEFAULT 0.000000,
  `CantMinima`           decimal(28,6) DEFAULT 0.000000,
  `PuntoReorden`         decimal(28,6) DEFAULT 0.000000,
  `CantFisica`           decimal(28,6) NOT NULL DEFAULT 0.000000,
  `CostoPromedio`        decimal(28,6) NOT NULL DEFAULT 0.000000,
  `IdUnidad`             int(11)       NOT NULL DEFAULT 1,
  `Iva`                  int(11)       NOT NULL DEFAULT 0,
  `IdAgrup1`             int(11)       NOT NULL DEFAULT 1,
  `Observacion`          varchar(1000) DEFAULT NULL,
  `IdTipoInv`            int(11)       NOT NULL DEFAULT 1,
  `EsFactSinExistencia`  tinyint(4)    NOT NULL DEFAULT 0,
  `TipoVentaKit`         tinyint(4)    DEFAULT 0,
  `EsFactorMov`          tinyint(4)    NOT NULL DEFAULT 0,
  `IdClasifImpto`        int(11)       NOT NULL DEFAULT 1,
  `EsImpBolsas`          tinyint(4)    DEFAULT 0,
  `ValorImpBolsas`       int(11)       DEFAULT 0,
  `FechaCreacion`        datetime      DEFAULT NULL,
  `FechaUltModificacion` datetime      DEFAULT NULL,
  `FactorEscala1`        decimal(28,6) DEFAULT NULL,
  `FactorEscala2`        decimal(28,6) DEFAULT NULL,
  PRIMARY KEY (`IdInventario`),
  UNIQUE KEY `XI_CodInventario` (`CodInventario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `inventarios`
  (`IdInventario`, `CodInventario`, `CodigoBarras`, `NomInventario`, `EsActivo`,
   `CantMaxima`, `CantMinima`, `PuntoReorden`, `CantFisica`, `CostoPromedio`,
   `IdUnidad`, `Iva`, `IdAgrup1`, `Observacion`, `IdTipoInv`,
   `EsFactSinExistencia`, `TipoVentaKit`, `EsFactorMov`, `IdClasifImpto`,
   `EsImpBolsas`, `ValorImpBolsas`, `FechaCreacion`, `FechaUltModificacion`,
   `FactorEscala1`, `FactorEscala2`)
VALUES
  (1, 'PROD001', NULL,            'Gaseosa 350ml',    1, 0, 0, 0, 100.000000, 1500.000000, 1, 0,  1, NULL, 1, 0, 0, 0, 1, 0, 0, NULL, NULL, NULL, NULL),
  (2, 'PROD002', '7890001234567', 'Agua Mineral 500ml',1, 0, 0, 0,  50.000000,  800.000000, 1, 0,  1, NULL, 1, 0, 0, 0, 1, 0, 0, NULL, NULL, NULL, NULL),
  (3, 'PROD003', NULL,            'Cafe Negro 250g',   1, 0, 0, 0,  20.000000, 2000.000000, 1, 19, 1, NULL, 1, 0, 0, 0, 1, 0, 0, NULL, NULL, NULL, NULL);

-- ============================================================
-- Lookup: inventarios_precios  (one price per product, IdLista=1)
-- ============================================================
CREATE TABLE `inventarios_precios` (
  `IdInvP`       int(11)       NOT NULL AUTO_INCREMENT,
  `IdLista`      int(11)       NOT NULL,
  `IdInventario` int(11)       NOT NULL,
  `Precio`       decimal(28,6) NOT NULL DEFAULT 0.000000,
  `Porcentaje`   int(11)       NOT NULL DEFAULT 0,
  PRIMARY KEY (`IdInvP`),
  UNIQUE KEY `IdLista_IdInv_Unique` (`IdLista`, `IdInventario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `inventarios_precios`
  (`IdInvP`, `IdLista`, `IdInventario`, `Precio`, `Porcentaje`)
VALUES
  (1, 1, 1, 2000.000000, 0),
  (2, 1, 2, 1200.000000, 0),
  (3, 1, 3, 3000.000000, 0);

-- ============================================================
-- Map: encabezados → orders
--   Order 1: completed (EsAnulado=0), Order 2: cancelled (EsAnulado=1)
-- ============================================================
CREATE TABLE `encabezados` (
  `IdEncab`      int(11)       NOT NULL AUTO_INCREMENT,
  `IdEmpresa`    int(11)       NOT NULL,
  `IdDocumento`  int(11)       NOT NULL DEFAULT 1,
  `NumDocumento` varchar(11)   NOT NULL,
  `Fecha`        datetime      NOT NULL,
  `Vence`        datetime      DEFAULT NULL,
  `IdCliente`    int(11)       NOT NULL,
  `IdUsuario`    int(11)       NOT NULL,
  `Nota`         varchar(1000) DEFAULT NULL,
  `IdFormaPago`  int(11)       NOT NULL,
  `EsAnulado`    tinyint(4)    NOT NULL DEFAULT 0,
  `ValorPago`    decimal(28,6) DEFAULT NULL,
  `IdResol`      int(11)       DEFAULT NULL,
  PRIMARY KEY (`IdEncab`),
  UNIQUE KEY `IdEncab_UNIQUE` (`IdEncab`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `encabezados`
  (`IdEncab`, `IdEmpresa`, `IdDocumento`, `NumDocumento`, `Fecha`,
   `Vence`, `IdCliente`, `IdUsuario`, `Nota`, `IdFormaPago`, `EsAnulado`, `ValorPago`, `IdResol`)
VALUES
  (1, 1, 1, 'FA-0001', '2024-01-20 10:00:00', NULL, 1, 1, NULL, 1, 0, 5200.000000, NULL),
  (2, 1, 1, 'FA-0002', '2024-01-21 14:30:00', NULL, 2, 1, NULL, 2, 1, 3570.000000, NULL);

-- ============================================================
-- Map: encabezados_mov → order_items
--   Lines for both orders; sums drive orders.subtotal/tax/total
--   Order 1 subtotal=5200, tax=0, total=5200
--   Order 2 subtotal=3000, tax=570, total=3570
-- ============================================================
CREATE TABLE `encabezados_mov` (
  `IdEncabMov`     int(11)       NOT NULL AUTO_INCREMENT,
  `IdEncab`        int(11)       NOT NULL,
  `IdInventario`   int(11)       NOT NULL,
  `Cant`           decimal(28,6) NOT NULL,
  `FactorCant`     decimal(28,6) DEFAULT NULL,
  `FactorMov`      tinyint(4)    DEFAULT NULL,
  `Iva`            int(11)       NOT NULL DEFAULT 0,
  `ValorUnit`      decimal(28,6) NOT NULL,
  `ValorSubTotal`  decimal(28,6) NOT NULL,
  `ValorIva`       decimal(28,6) NOT NULL,
  `ValorIpoConsumo` decimal(28,6) DEFAULT NULL,
  `ValorTotal`     decimal(28,6) NOT NULL,
  `IdCliente`      int(11)       NOT NULL DEFAULT 1,
  `Nota`           varchar(100)  DEFAULT NULL,
  `Dcto`           decimal(28,6) DEFAULT NULL,
  PRIMARY KEY (`IdEncabMov`),
  UNIQUE KEY `IdEncabMov_UNIQUE` (`IdEncabMov`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `encabezados_mov`
  (`IdEncabMov`, `IdEncab`, `IdInventario`, `Cant`,
   `FactorCant`, `FactorMov`, `Iva`,
   `ValorUnit`, `ValorSubTotal`, `ValorIva`, `ValorIpoConsumo`, `ValorTotal`,
   `IdCliente`, `Nota`, `Dcto`)
VALUES
  (1, 1, 1, 2.000000, NULL, NULL, 0,  2000.000000, 4000.000000,   0.000000, NULL, 4000.000000, 1, NULL, NULL),
  (2, 1, 2, 1.000000, NULL, NULL, 0,  1200.000000, 1200.000000,   0.000000, NULL, 1200.000000, 1, NULL, NULL),
  (3, 2, 3, 1.000000, NULL, NULL, 19, 3000.000000, 3000.000000, 570.000000, NULL, 3570.000000, 2, NULL, NULL);

-- ============================================================
-- Map: encabezados_pagodet → payments
-- ============================================================
CREATE TABLE `encabezados_pagodet` (
  `IdPago`      int(11)       NOT NULL AUTO_INCREMENT,
  `IdEncab`     int(11)       NOT NULL,
  `NumDoc`      varchar(80)   DEFAULT NULL,
  `ValorPago`   decimal(28,6) DEFAULT NULL,
  `FechaPago`   datetime      DEFAULT NULL,
  `IdFormaPago` int(11)       NOT NULL,
  `ValorIVA`    decimal(28,6) NOT NULL DEFAULT 0.000000,
  `FactorSuma`  tinyint(4)    DEFAULT NULL,
  PRIMARY KEY (`IdPago`),
  UNIQUE KEY `IdPago_UNIQUE` (`IdPago`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `encabezados_pagodet`
  (`IdPago`, `IdEncab`, `NumDoc`, `ValorPago`, `FechaPago`, `IdFormaPago`, `ValorIVA`, `FactorSuma`)
VALUES
  (1, 1, NULL, 5200.000000, '2024-01-20 10:05:00', 1, 0.000000, NULL),
  (2, 2, NULL, 3570.000000, '2024-01-21 14:35:00', 2, 0.000000, NULL);

SET FOREIGN_KEY_CHECKS = 1;
