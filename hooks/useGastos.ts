import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Gasto, Moneda } from '@/database/types';
import { sumCents } from '@/utils/currency';

export interface NewGastoInput {
  categoria: string;
  descripcion?: string | null;
  moneda?: Moneda | string;
  monto_bs: number; // en centavos
  tasa_cambio: number;
  monto_usd: number; // en centavos
  fecha_gasto?: string; // ISO 8601
}

export function useGastos() {
  const db = useSQLiteContext();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Consulta todos los gastos ordenados por fecha descendente usando prepared statements.
   */
  const fetchGastos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const query = `
        SELECT id, categoria, descripcion, moneda, monto_bs, tasa_cambio, monto_usd, fecha_gasto
        FROM gastos
        ORDER BY datetime(fecha_gasto) DESC, id DESC
      `;
      const rows = await db.getAllAsync<Gasto>(query);
      setGastos(rows);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los gastos');
    } finally {
      setLoading(false);
    }
  }, [db]);

  /**
   * Inserta un nuevo gasto en SQLite con parámetros vinculados.
   */
  const insertGasto = useCallback(
    async (input: NewGastoInput): Promise<number> => {
      try {
        setError(null);
        const fecha = input.fecha_gasto || new Date().toISOString();
        const moneda = input.moneda || 'BS';
        const descripcion = input.descripcion?.trim() || null;

        const statement = await db.prepareAsync(
          'INSERT INTO gastos (categoria, descripcion, moneda, monto_bs, tasa_cambio, monto_usd, fecha_gasto) VALUES ($categoria, $descripcion, $moneda, $monto_bs, $tasa_cambio, $monto_usd, $fecha_gasto)'
        );

        try {
          const result = await statement.executeAsync({
            $categoria: input.categoria.trim(),
            $descripcion: descripcion,
            $moneda: moneda,
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_gasto: fecha,
          });

          await fetchGastos();
          return result.lastInsertRowId;
        } finally {
          await statement.finalizeAsync();
        }
      } catch (err: any) {
        setError(err?.message || 'Error al guardar el gasto');
        throw err;
      }
    },
    [db, fetchGastos]
  );

  /**
   * Actualiza un gasto existente por ID.
   */
  const updateGasto = useCallback(
    async (id: number, input: NewGastoInput): Promise<void> => {
      try {
        setError(null);
        const fecha = input.fecha_gasto || new Date().toISOString();
        const moneda = input.moneda || 'BS';
        const descripcion = input.descripcion?.trim() || null;

        const statement = await db.prepareAsync(
          `UPDATE gastos 
           SET categoria = $categoria, 
               descripcion = $descripcion, 
               moneda = $moneda, 
               monto_bs = $monto_bs, 
               tasa_cambio = $tasa_cambio, 
               monto_usd = $monto_usd, 
               fecha_gasto = $fecha_gasto 
           WHERE id = $id`
        );

        try {
          await statement.executeAsync({
            $id: id,
            $categoria: input.categoria.trim(),
            $descripcion: descripcion,
            $moneda: moneda,
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_gasto: fecha,
          });

          await fetchGastos();
        } finally {
          await statement.finalizeAsync();
        }
      } catch (err: any) {
        setError(err?.message || 'Error al actualizar el gasto');
        throw err;
      }
    },
    [db, fetchGastos]
  );

  /**
   * Elimina un gasto por ID usando parámetros vinculados.
   */
  const deleteGasto = useCallback(
    async (id: number): Promise<void> => {
      try {
        setError(null);
        const statement = await db.prepareAsync('DELETE FROM gastos WHERE id = $id');
        try {
          await statement.executeAsync({ $id: id });
          await fetchGastos();
        } finally {
          await statement.finalizeAsync();
        }
      } catch (err: any) {
        setError(err?.message || 'Error al eliminar el gasto');
        throw err;
      }
    },
    [db, fetchGastos]
  );

  useEffect(() => {
    fetchGastos();
  }, [fetchGastos]);

  useFocusEffect(
    useCallback(() => {
      fetchGastos();
    }, [fetchGastos])
  );

  // Estadísticas Generales (Histórico)
  const totalGeneralBs = useMemo(() => sumCents(gastos.map((g) => g.monto_bs)), [gastos]);
  const totalGeneralUsd = useMemo(() => sumCents(gastos.map((g) => g.monto_usd)), [gastos]);
  const cantidadGeneral = gastos.length;

  // Estadísticas del Mes en curso
  const { totalMesBs, totalMesUsd, cantidadMes } = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const gastosDelMes = gastos.filter((g) => {
      if (!g.fecha_gasto) return false;
      return g.fecha_gasto.startsWith(currentYearMonth);
    });

    return {
      totalMesBs: sumCents(gastosDelMes.map((g) => g.monto_bs)),
      totalMesUsd: sumCents(gastosDelMes.map((g) => g.monto_usd)),
      cantidadMes: gastosDelMes.length,
    };
  }, [gastos]);

  return {
    gastos,
    loading,
    error,
    fetchGastos,
    insertGasto,
    updateGasto,
    deleteGasto,
    // Estadísticas
    totalGeneralBs,
    totalGeneralUsd,
    cantidadGeneral,
    totalMesBs,
    totalMesUsd,
    cantidadMes,
    // Compatibilidad retroactiva
    totalBs: totalGeneralBs,
    totalUsd: totalGeneralUsd,
  };
}
