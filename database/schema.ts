export const DATABASE_NAME = 'app_contable.db';

export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  -- Tabla de Deudas
  CREATE TABLE IF NOT EXISTS deudas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concepto TEXT NOT NULL,
    monto_total INTEGER NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'USD',
    monto_bs INTEGER NOT NULL DEFAULT 0,
    tasa_cambio REAL NOT NULL DEFAULT 1.0,
    monto_usd INTEGER NOT NULL DEFAULT 0,
    fecha_creacion TEXT NOT NULL,
    estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'PAGADA', 'CANCELADA'))
  );

  -- Tabla de Pagos asociados a Deudas
  CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    deuda_id INTEGER NOT NULL,
    monto_pago INTEGER NOT NULL,
    monto_bs INTEGER NOT NULL DEFAULT 0,
    tasa_cambio REAL NOT NULL DEFAULT 1.0,
    monto_usd INTEGER NOT NULL DEFAULT 0,
    fecha_pago TEXT NOT NULL,
    FOREIGN KEY (deuda_id) REFERENCES deudas(id) ON DELETE CASCADE
  );

  -- Tabla de Gastos
  CREATE TABLE IF NOT EXISTS gastos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categoria TEXT NOT NULL,
    descripcion TEXT,
    moneda TEXT NOT NULL DEFAULT 'BS',
    monto_bs INTEGER NOT NULL,
    tasa_cambio REAL NOT NULL,
    monto_usd INTEGER NOT NULL,
    fecha_gasto TEXT NOT NULL
  );

  -- Tabla de Pagos a Proveedores
  CREATE TABLE IF NOT EXISTS pagos_proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor TEXT NOT NULL,
    descripcion TEXT,
    moneda TEXT NOT NULL DEFAULT 'USD',
    monto_bs INTEGER NOT NULL DEFAULT 0,
    tasa_cambio REAL NOT NULL DEFAULT 1.0,
    monto_usd INTEGER NOT NULL DEFAULT 0,
    fecha_pago TEXT NOT NULL,
    mes_asignado TEXT NOT NULL
  );

  -- Tabla de Objetivos de Ahorro
  CREATE TABLE IF NOT EXISTS ahorros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    monto_objetivo INTEGER NOT NULL,
    moneda TEXT NOT NULL DEFAULT 'USD',
    monto_bs INTEGER NOT NULL DEFAULT 0,
    tasa_cambio REAL NOT NULL DEFAULT 1.0,
    monto_usd INTEGER NOT NULL DEFAULT 0,
    fecha_creacion TEXT NOT NULL,
    fecha_limite TEXT,
    categoria TEXT DEFAULT 'General',
    estado TEXT NOT NULL DEFAULT 'EN_PROGRESO' CHECK (estado IN ('EN_PROGRESO', 'COMPLETADO', 'CANCELADO'))
  );

  -- Tabla de Aportes a Objetivos de Ahorro
  CREATE TABLE IF NOT EXISTS aportes_ahorro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ahorro_id INTEGER NOT NULL,
    monto_aporte INTEGER NOT NULL,
    monto_bs INTEGER NOT NULL DEFAULT 0,
    tasa_cambio REAL NOT NULL DEFAULT 1.0,
    monto_usd INTEGER NOT NULL DEFAULT 0,
    fecha_aporte TEXT NOT NULL,
    nota TEXT,
    FOREIGN KEY (ahorro_id) REFERENCES ahorros(id) ON DELETE CASCADE
  );

  -- Índices para optimización de consultas
  CREATE INDEX IF NOT EXISTS idx_pagos_deuda_id ON pagos(deuda_id);
  CREATE INDEX IF NOT EXISTS idx_deudas_estado ON deudas(estado);
  CREATE INDEX IF NOT EXISTS idx_deudas_fecha ON deudas(fecha_creacion);
  CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha_gasto);
  CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos(categoria);
  CREATE INDEX IF NOT EXISTS idx_pagos_prov_mes ON pagos_proveedores(mes_asignado);
  CREATE INDEX IF NOT EXISTS idx_pagos_prov_fecha ON pagos_proveedores(fecha_pago);
  CREATE INDEX IF NOT EXISTS idx_pagos_prov_nombre ON pagos_proveedores(proveedor);
  CREATE INDEX IF NOT EXISTS idx_aportes_ahorro_id ON aportes_ahorro(ahorro_id);
  CREATE INDEX IF NOT EXISTS idx_ahorros_estado ON ahorros(estado);
  CREATE INDEX IF NOT EXISTS idx_ahorros_fecha ON ahorros(fecha_creacion);
`;
