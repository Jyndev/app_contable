import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as SQLite from 'expo-sqlite';
import { Deuda, Pago, Gasto, PagoProveedor, Ahorro, AporteAhorro } from '@/database/types';

export interface BackupData {
  app: string;
  version: string;
  exported_at: string;
  resumen: {
    total_deudas: number;
    total_pagos: number;
    total_gastos: number;
    total_pagos_proveedores: number;
    total_ahorros?: number;
    total_aportes_ahorro?: number;
  };
  deudas: Deuda[];
  pagos: Pago[];
  gastos: Gasto[];
  pagos_proveedores?: PagoProveedor[];
  ahorros?: Ahorro[];
  aportes_ahorro?: AporteAhorro[];
}

export interface ImportResult {
  deudasCount: number;
  pagosCount: number;
  gastosCount: number;
  pagosProveedoresCount: number;
  ahorrosCount?: number;
  aportesAhorroCount?: number;
}

/**
 * Genera un volcado completo de la base de datos a un archivo JSON y activa el menú de compartir del sistema.
 */
export async function exportDatabaseBackup(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    // 1. Consultar todos los datos con prepared statements/parámetros
    const deudas = await db.getAllAsync<Deuda>('SELECT * FROM deudas ORDER BY id ASC');
    const pagos = await db.getAllAsync<Pago>('SELECT * FROM pagos ORDER BY id ASC');
    const gastos = await db.getAllAsync<Gasto>('SELECT * FROM gastos ORDER BY id ASC');
    const pagosProveedores = await db.getAllAsync<PagoProveedor>('SELECT * FROM pagos_proveedores ORDER BY id ASC');
    const ahorros = await db.getAllAsync<Ahorro>('SELECT * FROM ahorros ORDER BY id ASC');
    const aportesAhorro = await db.getAllAsync<AporteAhorro>('SELECT * FROM aportes_ahorro ORDER BY id ASC');

    const backupData: BackupData = {
      app: 'App Contable Offline',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      resumen: {
        total_deudas: deudas.length,
        total_pagos: pagos.length,
        total_gastos: gastos.length,
        total_pagos_proveedores: pagosProveedores.length,
        total_ahorros: ahorros.length,
        total_aportes_ahorro: aportesAhorro.length,
      },
      deudas,
      pagos,
      gastos,
      pagos_proveedores: pagosProveedores,
      ahorros,
      aportes_ahorro: aportesAhorro,
    };

    // 2. Crear nombre de archivo con timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    const fileName = `respaldo_contable_${timestamp}.json`;
    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
    const fileUri = `${baseDir}${fileName}`;

    // 3. Escribir archivo localmente
    const jsonString = JSON.stringify(backupData, null, 2);
    await FileSystem.writeAsStringAsync(fileUri, jsonString, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // 4. Compartir usando el menú nativo
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error(
        'La opción de compartir no está disponible en este dispositivo. Archivo guardado en: ' +
          fileUri
      );
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Exportar Respaldo Contable',
      UTI: 'public.json',
    });
  } catch (error: any) {
    throw new Error(error?.message || 'Error al exportar el respaldo');
  }
}

/**
 * Permite seleccionar un archivo de respaldo JSON y restaurar toda la base de datos de manera atómica.
 */
export async function importDatabaseBackup(db: SQLite.SQLiteDatabase): Promise<ImportResult | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const fileUri = result.assets[0].uri;
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let parsedData: any;
    try {
      parsedData = JSON.parse(fileContent);
    } catch {
      throw new Error('El archivo seleccionado no tiene un formato JSON válido.');
    }

    if (
      !parsedData ||
      !Array.isArray(parsedData.deudas) ||
      !Array.isArray(parsedData.pagos) ||
      !Array.isArray(parsedData.gastos)
    ) {
      throw new Error('El archivo JSON no contiene la estructura requerida de respaldo.');
    }

    const deudas: Deuda[] = parsedData.deudas;
    const pagos: Pago[] = parsedData.pagos;
    const gastos: Gasto[] = parsedData.gastos;
    const pagosProveedores: PagoProveedor[] = Array.isArray(parsedData.pagos_proveedores)
      ? parsedData.pagos_proveedores
      : [];
    const ahorros: Ahorro[] = Array.isArray(parsedData.ahorros) ? parsedData.ahorros : [];
    const aportesAhorro: AporteAhorro[] = Array.isArray(parsedData.aportes_ahorro)
      ? parsedData.aportes_ahorro
      : [];

    await db.execAsync('BEGIN TRANSACTION;');
    try {
      await db.runAsync('DELETE FROM pagos;');
      await db.runAsync('DELETE FROM deudas;');
      await db.runAsync('DELETE FROM gastos;');
      await db.runAsync('DELETE FROM pagos_proveedores;');
      await db.runAsync('DELETE FROM aportes_ahorro;');
      await db.runAsync('DELETE FROM ahorros;');

      for (const d of deudas) {
        await db.runAsync(
          `INSERT INTO deudas (id, concepto, monto_total, moneda, monto_bs, tasa_cambio, monto_usd, fecha_creacion, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            d.id,
            d.concepto,
            d.monto_total,
            d.moneda || 'USD',
            d.monto_bs || 0,
            d.tasa_cambio || 1.0,
            d.monto_usd || 0,
            d.fecha_creacion || new Date().toISOString(),
            d.estado || 'PENDIENTE',
          ]
        );
      }

      for (const p of pagos) {
        await db.runAsync(
          `INSERT INTO pagos (id, deuda_id, monto_pago, monto_bs, tasa_cambio, monto_usd, fecha_pago)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            p.id,
            p.deuda_id,
            p.monto_pago,
            p.monto_bs || 0,
            p.tasa_cambio || 1.0,
            p.monto_usd || 0,
            p.fecha_pago || new Date().toISOString(),
          ]
        );
      }

      for (const g of gastos) {
        await db.runAsync(
          `INSERT INTO gastos (id, categoria, descripcion, moneda, monto_bs, tasa_cambio, monto_usd, fecha_gasto)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            g.id,
            g.categoria,
            g.descripcion || null,
            g.moneda || 'BS',
            g.monto_bs || 0,
            g.tasa_cambio || 1.0,
            g.monto_usd || 0,
            g.fecha_gasto || new Date().toISOString(),
          ]
        );
      }

      for (const pp of pagosProveedores) {
        await db.runAsync(
          `INSERT INTO pagos_proveedores (id, proveedor, descripcion, moneda, monto_bs, tasa_cambio, monto_usd, fecha_pago, mes_asignado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pp.id,
            pp.proveedor,
            pp.descripcion || null,
            pp.moneda || 'USD',
            pp.monto_bs || 0,
            pp.tasa_cambio || 1.0,
            pp.monto_usd || 0,
            pp.fecha_pago || new Date().toISOString(),
            pp.mes_asignado || pp.fecha_pago.slice(0, 7),
          ]
        );
      }

      for (const a of ahorros) {
        await db.runAsync(
          `INSERT INTO ahorros (id, titulo, monto_objetivo, moneda, monto_bs, tasa_cambio, monto_usd, fecha_creacion, fecha_limite, categoria, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            a.id,
            a.titulo,
            a.monto_objetivo,
            a.moneda || 'USD',
            a.monto_bs || 0,
            a.tasa_cambio || 1.0,
            a.monto_usd || 0,
            a.fecha_creacion || new Date().toISOString(),
            a.fecha_limite || null,
            a.categoria || 'General',
            a.estado || 'EN_PROGRESO',
          ]
        );
      }

      for (const ap of aportesAhorro) {
        await db.runAsync(
          `INSERT INTO aportes_ahorro (id, ahorro_id, monto_aporte, monto_bs, tasa_cambio, monto_usd, fecha_aporte, nota)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ap.id,
            ap.ahorro_id,
            ap.monto_aporte,
            ap.monto_bs || 0,
            ap.tasa_cambio || 1.0,
            ap.monto_usd || 0,
            ap.fecha_aporte || new Date().toISOString(),
            ap.nota || null,
          ]
        );
      }

      await db.execAsync('COMMIT;');
    } catch (err) {
      await db.execAsync('ROLLBACK;');
      throw err;
    }

    return {
      deudasCount: deudas.length,
      pagosCount: pagos.length,
      gastosCount: gastos.length,
      pagosProveedoresCount: pagosProveedores.length,
      ahorrosCount: ahorros.length,
      aportesAhorroCount: aportesAhorro.length,
    };
  } catch (error: any) {
    throw new Error(error?.message || 'Error al restaurar el respaldo');
  }
}
