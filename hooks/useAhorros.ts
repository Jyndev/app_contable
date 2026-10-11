import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Ahorro, AporteAhorro, AhorroConProgreso, Moneda, EstadoAhorro } from '@/database/types';
import { calculateBsFromUsd, calculateUsdFromBs } from '@/utils/currency';

export interface NewAhorroInput {
  titulo: string;
  monto_objetivo: number; // en centavos
  moneda: Moneda | string;
  monto_bs: number; // en centavos de BS
  tasa_cambio: number;
  monto_usd: number; // en centavos de USD
  fecha_creacion?: string;
  fecha_limite?: string | null;
  categoria?: string | null;
}

export interface NewAporteInput {
  ahorro_id: number;
  monto_aporte: number; // en centavos en la moneda base del ahorro
  monto_bs: number; // en centavos de BS
  tasa_cambio: number;
  monto_usd: number; // en centavos de USD
  fecha_aporte?: string;
  nota?: string | null;
}

export interface AhorroDetalleResponse {
  ahorro: AhorroConProgreso | null;
  aportes: AporteAhorro[];
}

export function useAhorros() {
  const db = useSQLiteContext();
  const [ahorros, setAhorros] = useState<AhorroConProgreso[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Consulta todas las metas de ahorro calculando el total acumulado y porcentaje en ambas monedas.
   */
  const fetchAhorros = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const query = `
        SELECT 
          a.id,
          a.titulo,
          a.monto_objetivo,
          a.moneda,
          COALESCE(a.monto_bs, 0) AS monto_bs,
          COALESCE(a.tasa_cambio, 1.0) AS tasa_cambio,
          COALESCE(a.monto_usd, 0) AS monto_usd,
          a.fecha_creacion,
          a.fecha_limite,
          COALESCE(a.categoria, 'General') AS categoria,
          a.estado,
          COALESCE(SUM(ap.monto_aporte), 0) AS total_ahorrado
        FROM ahorros a
        LEFT JOIN aportes_ahorro ap ON a.id = ap.ahorro_id
        GROUP BY a.id
        ORDER BY 
          CASE WHEN a.estado = 'EN_PROGRESO' THEN 0 ELSE 1 END,
          datetime(a.fecha_creacion) DESC,
          a.id DESC
      `;

      const rawRows = await db.getAllAsync<any>(query);

      const computed: AhorroConProgreso[] = rawRows.map((row) => {
        const totalAhorrado = Math.max(0, row.total_ahorrado || 0);
        const montoObjetivo = row.monto_objetivo > 0 ? row.monto_objetivo : 1;
        const saldoRestante = Math.max(0, montoObjetivo - totalAhorrado);
        const pct = Math.min(100, Math.max(0, Math.round((totalAhorrado / montoObjetivo) * 100)));

        const rate = Number(row.tasa_cambio) > 0 ? Number(row.tasa_cambio) : 1;
        const isBs = row.moneda === 'BS';

        const total_ahorrado_bs = isBs ? totalAhorrado : calculateBsFromUsd(totalAhorrado, rate);
        const total_ahorrado_usd = isBs ? calculateUsdFromBs(totalAhorrado, rate) : totalAhorrado;

        const saldo_restante_bs = isBs ? saldoRestante : calculateBsFromUsd(saldoRestante, rate);
        const saldo_restante_usd = isBs ? calculateUsdFromBs(saldoRestante, rate) : saldoRestante;

        const monto_objetivo_bs = isBs ? montoObjetivo : calculateBsFromUsd(montoObjetivo, rate);
        const monto_objetivo_usd = isBs ? calculateUsdFromBs(montoObjetivo, rate) : montoObjetivo;

        return {
          ...row,
          total_ahorrado: totalAhorrado,
          saldo_restante: saldoRestante,
          porcentaje_progreso: pct,
          total_ahorrado_bs,
          total_ahorrado_usd,
          saldo_restante_bs,
          saldo_restante_usd,
          monto_objetivo_bs,
          monto_objetivo_usd,
        };
      });

      setAhorros(computed);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los objetivos de ahorro');
    } finally {
      setLoading(false);
    }
  }, [db]);

  /**
   * Inserta un nuevo objetivo de ahorro.
   */
  const insertAhorro = useCallback(
    async (input: NewAhorroInput): Promise<number> => {
      try {
        setError(null);
        const fecha = input.fecha_creacion || new Date().toISOString();

        const statement = await db.prepareAsync(
          `INSERT INTO ahorros 
            (titulo, monto_objetivo, moneda, monto_bs, tasa_cambio, monto_usd, fecha_creacion, fecha_limite, categoria, estado) 
           VALUES 
            ($titulo, $monto_objetivo, $moneda, $monto_bs, $tasa_cambio, $monto_usd, $fecha_creacion, $fecha_limite, $categoria, $estado)`
        );

        try {
          const result = await statement.executeAsync({
            $titulo: input.titulo.trim(),
            $monto_objetivo: input.monto_objetivo,
            $moneda: input.moneda || 'USD',
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_creacion: fecha,
            $fecha_limite: input.fecha_limite || null,
            $categoria: input.categoria || 'General',
            $estado: 'EN_PROGRESO',
          });

          await fetchAhorros();
          return result.lastInsertRowId;
        } finally {
          await statement.finalizeAsync();
        }
      } catch (err: any) {
        setError(err?.message || 'Error al registrar el objetivo de ahorro');
        throw err;
      }
    },
    [db, fetchAhorros]
  );

  /**
   * Obtiene el detalle completo de una meta de ahorro junto con sus aportes.
   */
  const getAhorroDetalle = useCallback(
    async (ahorroId: number): Promise<AhorroDetalleResponse> => {
      try {
        const ahorroStmt = await db.prepareAsync(`
          SELECT 
            a.id,
            a.titulo,
            a.monto_objetivo,
            a.moneda,
            COALESCE(a.monto_bs, 0) AS monto_bs,
            COALESCE(a.tasa_cambio, 1.0) AS tasa_cambio,
            COALESCE(a.monto_usd, 0) AS monto_usd,
            a.fecha_creacion,
            a.fecha_limite,
            COALESCE(a.categoria, 'General') AS categoria,
            a.estado,
            COALESCE(SUM(ap.monto_aporte), 0) AS total_ahorrado
          FROM ahorros a
          LEFT JOIN aportes_ahorro ap ON a.id = ap.ahorro_id
          WHERE a.id = $id
          GROUP BY a.id
        `);

        let ahorro: AhorroConProgreso | null = null;
        try {
          const resAhorro = await ahorroStmt.executeAsync<any>({ $id: ahorroId });
          const row = await resAhorro.getFirstAsync();
          if (row) {
            const totalAhorrado = Math.max(0, row.total_ahorrado || 0);
            const montoObjetivo = row.monto_objetivo > 0 ? row.monto_objetivo : 1;
            const saldoRestante = Math.max(0, montoObjetivo - totalAhorrado);
            const pct = Math.min(100, Math.max(0, Math.round((totalAhorrado / montoObjetivo) * 100)));

            const rate = Number(row.tasa_cambio) > 0 ? Number(row.tasa_cambio) : 1;
            const isBs = row.moneda === 'BS';

            const total_ahorrado_bs = isBs ? totalAhorrado : calculateBsFromUsd(totalAhorrado, rate);
            const total_ahorrado_usd = isBs ? calculateUsdFromBs(totalAhorrado, rate) : totalAhorrado;

            const saldo_restante_bs = isBs ? saldoRestante : calculateBsFromUsd(saldoRestante, rate);
            const saldo_restante_usd = isBs ? calculateUsdFromBs(saldoRestante, rate) : saldoRestante;

            const monto_objetivo_bs = isBs ? montoObjetivo : calculateBsFromUsd(montoObjetivo, rate);
            const monto_objetivo_usd = isBs ? calculateUsdFromBs(montoObjetivo, rate) : montoObjetivo;

            ahorro = {
              ...row,
              total_ahorrado: totalAhorrado,
              saldo_restante: saldoRestante,
              porcentaje_progreso: pct,
              total_ahorrado_bs,
              total_ahorrado_usd,
              saldo_restante_bs,
              saldo_restante_usd,
              monto_objetivo_bs,
              monto_objetivo_usd,
            };
          }
        } finally {
          await ahorroStmt.finalizeAsync();
        }

        if (!ahorro) {
          return { ahorro: null, aportes: [] };
        }

        const aportesStmt = await db.prepareAsync(`
          SELECT 
            id, 
            ahorro_id, 
            monto_aporte, 
            COALESCE(monto_bs, 0) AS monto_bs, 
            COALESCE(tasa_cambio, 1.0) AS tasa_cambio, 
            COALESCE(monto_usd, 0) AS monto_usd, 
            fecha_aporte,
            nota
          FROM aportes_ahorro
          WHERE ahorro_id = $ahorro_id
          ORDER BY datetime(fecha_aporte) DESC, id DESC
        `);

        let aportes: AporteAhorro[] = [];
        try {
          const resAportes = await aportesStmt.executeAsync<AporteAhorro>({ $ahorro_id: ahorroId });
          aportes = await resAportes.getAllAsync();
        } finally {
          await aportesStmt.finalizeAsync();
        }

        return { ahorro, aportes };
      } catch (err: any) {
        throw new Error(err?.message || 'Error al obtener detalle del objetivo de ahorro');
      }
    },
    [db]
  );

  /**
   * Inserta un aporte y actualiza el estado de la meta si alcanza el 100%.
   */
  const insertAporte = useCallback(
    async (input: NewAporteInput): Promise<number> => {
      try {
        setError(null);
        const fecha = input.fecha_aporte || new Date().toISOString();

        const aporteStmt = await db.prepareAsync(
          `INSERT INTO aportes_ahorro 
            (ahorro_id, monto_aporte, monto_bs, tasa_cambio, monto_usd, fecha_aporte, nota) 
           VALUES 
            ($ahorro_id, $monto_aporte, $monto_bs, $tasa_cambio, $monto_usd, $fecha_aporte, $nota)`
        );

        let aporteId = 0;
        try {
          const res = await aporteStmt.executeAsync({
            $ahorro_id: input.ahorro_id,
            $monto_aporte: input.monto_aporte,
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_aporte: fecha,
            $nota: input.nota || null,
          });
          aporteId = res.lastInsertRowId;
        } finally {
          await aporteStmt.finalizeAsync();
        }

        // Comprobar si se completó el objetivo
        const checkStmt = await db.prepareAsync(`
          SELECT 
            a.monto_objetivo,
            COALESCE(SUM(ap.monto_aporte), 0) AS total_ahorrado
          FROM ahorros a
          LEFT JOIN aportes_ahorro ap ON a.id = ap.ahorro_id
          WHERE a.id = $id
          GROUP BY a.id
        `);

        try {
          const resCheck = await checkStmt.executeAsync<{
            monto_objetivo: number;
            total_ahorrado: number;
          }>({ $id: input.ahorro_id });
          const row = await resCheck.getFirstAsync();

          if (row && row.total_ahorrado >= row.monto_objetivo) {
            const updateStmt = await db.prepareAsync(
              "UPDATE ahorros SET estado = 'COMPLETADO' WHERE id = $id"
            );
            try {
              await updateStmt.executeAsync({ $id: input.ahorro_id });
            } finally {
              await updateStmt.finalizeAsync();
            }
          }
        } finally {
          await checkStmt.finalizeAsync();
        }

        await fetchAhorros();
        return aporteId;
      } catch (err: any) {
        setError(err?.message || 'Error al registrar el aporte');
        throw err;
      }
    },
    [db, fetchAhorros]
  );

  /**
   * Actualiza un aporte existente.
   */
  const updateAporte = useCallback(
    async (aporteId: number, ahorroId: number, input: NewAporteInput): Promise<void> => {
      try {
        setError(null);
        const fecha = input.fecha_aporte || new Date().toISOString();

        const stmt = await db.prepareAsync(
          `UPDATE aportes_ahorro 
           SET monto_aporte = $monto_aporte,
               monto_bs = $monto_bs,
               tasa_cambio = $tasa_cambio,
               monto_usd = $monto_usd,
               fecha_aporte = $fecha_aporte,
               nota = $nota
           WHERE id = $id AND ahorro_id = $ahorro_id`
        );

        try {
          await stmt.executeAsync({
            $id: aporteId,
            $ahorro_id: ahorroId,
            $monto_aporte: input.monto_aporte,
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_aporte: fecha,
            $nota: input.nota || null,
          });
        } finally {
          await stmt.finalizeAsync();
        }

        // Recalcular estado del objetivo
        const checkStmt = await db.prepareAsync(`
          SELECT 
            a.monto_objetivo,
            COALESCE(SUM(ap.monto_aporte), 0) AS total_ahorrado
          FROM ahorros a
          LEFT JOIN aportes_ahorro ap ON a.id = ap.ahorro_id
          WHERE a.id = $id
          GROUP BY a.id
        `);

        try {
          const resCheck = await checkStmt.executeAsync<{
            monto_objetivo: number;
            total_ahorrado: number;
          }>({ $id: ahorroId });
          const row = await resCheck.getFirstAsync();

          if (row) {
            const nuevoEstado = row.total_ahorrado >= row.monto_objetivo ? 'COMPLETADO' : 'EN_PROGRESO';
            const updateStmt = await db.prepareAsync(
              'UPDATE ahorros SET estado = $estado WHERE id = $id'
            );
            try {
              await updateStmt.executeAsync({ $id: ahorroId, $estado: nuevoEstado });
            } finally {
              await updateStmt.finalizeAsync();
            }
          }
        } finally {
          await checkStmt.finalizeAsync();
        }

        await fetchAhorros();
      } catch (err: any) {
        setError(err?.message || 'Error al actualizar el aporte');
        throw err;
      }
    },
    [db, fetchAhorros]
  );

  /**
   * Actualiza los datos de un objetivo de ahorro.
   */
  const updateAhorro = useCallback(
    async (id: number, input: NewAhorroInput): Promise<void> => {
      try {
        setError(null);
        const statement = await db.prepareAsync(
          `UPDATE ahorros 
           SET titulo = $titulo,
               monto_objetivo = $monto_objetivo,
               moneda = $moneda,
               monto_bs = $monto_bs,
               tasa_cambio = $tasa_cambio,
               monto_usd = $monto_usd,
               fecha_limite = $fecha_limite,
               categoria = $categoria
           WHERE id = $id`
        );

        try {
          await statement.executeAsync({
            $id: id,
            $titulo: input.titulo.trim(),
            $monto_objetivo: input.monto_objetivo,
            $moneda: input.moneda || 'USD',
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_limite: input.fecha_limite || null,
            $categoria: input.categoria || 'General',
          });
        } finally {
          await statement.finalizeAsync();
        }

        // Recalcular estado
        const checkStmt = await db.prepareAsync(`
          SELECT 
            a.monto_objetivo,
            COALESCE(SUM(ap.monto_aporte), 0) AS total_ahorrado
          FROM ahorros a
          LEFT JOIN aportes_ahorro ap ON a.id = ap.ahorro_id
          WHERE a.id = $id
          GROUP BY a.id
        `);

        try {
          const resCheck = await checkStmt.executeAsync<{
            monto_objetivo: number;
            total_ahorrado: number;
          }>({ $id: id });
          const row = await resCheck.getFirstAsync();

          if (row) {
            const nuevoEstado = row.total_ahorrado >= row.monto_objetivo ? 'COMPLETADO' : 'EN_PROGRESO';
            const updateStmt = await db.prepareAsync(
              'UPDATE ahorros SET estado = $estado WHERE id = $id'
            );
            try {
              await updateStmt.executeAsync({ $id: id, $estado: nuevoEstado });
            } finally {
              await updateStmt.finalizeAsync();
            }
          }
        } finally {
          await checkStmt.finalizeAsync();
        }

        await fetchAhorros();
      } catch (err: any) {
        setError(err?.message || 'Error al actualizar el objetivo de ahorro');
        throw err;
      }
    },
    [db, fetchAhorros]
  );

  /**
   * Elimina un aporte.
   */
  const deleteAporte = useCallback(
    async (aporteId: number, ahorroId: number): Promise<void> => {
      try {
        setError(null);
        const delStmt = await db.prepareAsync('DELETE FROM aportes_ahorro WHERE id = $id');
        try {
          await delStmt.executeAsync({ $id: aporteId });
        } finally {
          await delStmt.finalizeAsync();
        }

        // Recalcular estado
        const checkStmt = await db.prepareAsync(`
          SELECT 
            a.monto_objetivo,
            COALESCE(SUM(ap.monto_aporte), 0) AS total_ahorrado
          FROM ahorros a
          LEFT JOIN aportes_ahorro ap ON a.id = ap.ahorro_id
          WHERE a.id = $id
          GROUP BY a.id
        `);

        try {
          const resCheck = await checkStmt.executeAsync<{
            monto_objetivo: number;
            total_ahorrado: number;
          }>({ $id: ahorroId });
          const row = await resCheck.getFirstAsync();

          if (row) {
            const nuevoEstado = row.total_ahorrado >= row.monto_objetivo ? 'COMPLETADO' : 'EN_PROGRESO';
            const updateStmt = await db.prepareAsync(
              'UPDATE ahorros SET estado = $estado WHERE id = $id'
            );
            try {
              await updateStmt.executeAsync({ $id: ahorroId, $estado: nuevoEstado });
            } finally {
              await updateStmt.finalizeAsync();
            }
          }
        } finally {
          await checkStmt.finalizeAsync();
        }

        await fetchAhorros();
      } catch (err: any) {
        setError(err?.message || 'Error al eliminar el aporte');
        throw err;
      }
    },
    [db, fetchAhorros]
  );

  /**
   * Elimina un objetivo de ahorro y sus aportes asociados (ON DELETE CASCADE).
   */
  const deleteAhorro = useCallback(
    async (id: number): Promise<void> => {
      try {
        setError(null);
        const statement = await db.prepareAsync('DELETE FROM ahorros WHERE id = $id');
        try {
          await statement.executeAsync({ $id: id });
        } finally {
          await statement.finalizeAsync();
        }

        await fetchAhorros();
      } catch (err: any) {
        setError(err?.message || 'Error al eliminar el objetivo de ahorro');
        throw err;
      }
    },
    [db, fetchAhorros]
  );

  useEffect(() => {
    fetchAhorros();
  }, [fetchAhorros]);

  // Métricas agregadas
  const totalAhorradoUsd = ahorros.reduce((acc, a) => acc + a.total_ahorrado_usd, 0);
  const totalAhorradoBs = ahorros.reduce((acc, a) => acc + a.total_ahorrado_bs, 0);
  const totalObjetivoUsd = ahorros.reduce((acc, a) => acc + a.monto_objetivo_usd, 0);
  const totalObjetivoBs = ahorros.reduce((acc, a) => acc + a.monto_objetivo_bs, 0);

  const porcentajeGlobal =
    totalObjetivoUsd > 0
      ? Math.min(100, Math.max(0, Math.round((totalAhorradoUsd / totalObjetivoUsd) * 100)))
      : 0;

  return {
    ahorros,
    loading,
    error,
    fetchAhorros,
    insertAhorro,
    updateAhorro,
    deleteAhorro,
    getAhorroDetalle,
    insertAporte,
    updateAporte,
    deleteAporte,
    totalAhorradoUsd,
    totalAhorradoBs,
    totalObjetivoUsd,
    totalObjetivoBs,
    porcentajeGlobal,
  };
}
