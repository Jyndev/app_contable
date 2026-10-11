import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, CREATE_TABLES_SQL } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Función de inicialización de la base de datos: ejecuta DDL y migraciones incrementales seguras.
 */
export async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);

  // Migraciones automáticas seguras para columnas añadidas
  try {
    const deudaColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(deudas)"
    );
    const colNames = deudaColumns.map((c) => c.name);

    if (!colNames.includes('monto_bs')) {
      await db.execAsync('ALTER TABLE deudas ADD COLUMN monto_bs INTEGER NOT NULL DEFAULT 0;');
    }
    if (!colNames.includes('tasa_cambio')) {
      await db.execAsync('ALTER TABLE deudas ADD COLUMN tasa_cambio REAL NOT NULL DEFAULT 1.0;');
    }
    if (!colNames.includes('monto_usd')) {
      await db.execAsync('ALTER TABLE deudas ADD COLUMN monto_usd INTEGER NOT NULL DEFAULT 0;');
    }

    const pagoColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(pagos)"
    );
    const pagoColNames = pagoColumns.map((c) => c.name);

    if (!pagoColNames.includes('monto_bs')) {
      await db.execAsync('ALTER TABLE pagos ADD COLUMN monto_bs INTEGER NOT NULL DEFAULT 0;');
    }
    if (!pagoColNames.includes('tasa_cambio')) {
      await db.execAsync('ALTER TABLE pagos ADD COLUMN tasa_cambio REAL NOT NULL DEFAULT 1.0;');
    }
    if (!pagoColNames.includes('monto_usd')) {
      await db.execAsync('ALTER TABLE pagos ADD COLUMN monto_usd INTEGER NOT NULL DEFAULT 0;');
    }

    const gastoColumns = await db.getAllAsync<{ name: string }>(
      "PRAGMA table_info(gastos)"
    );
    const gastoColNames = gastoColumns.map((c) => c.name);

    if (!gastoColNames.includes('descripcion')) {
      await db.execAsync('ALTER TABLE gastos ADD COLUMN descripcion TEXT;');
    }
    if (!gastoColNames.includes('moneda')) {
      await db.execAsync("ALTER TABLE gastos ADD COLUMN moneda TEXT NOT NULL DEFAULT 'BS';");
    }
  } catch (migrationErr) {
    console.warn('Migración de columnas comprobada o completada:', migrationErr);
  }
}

/**
 * Obtiene o inicializa la instancia única de la base de datos SQLite.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await initializeDatabase(dbInstance);
  }
  return dbInstance;
}

export * from './schema';
export * from './types';
