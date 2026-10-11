import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { PagoProveedor, Moneda } from '@/database/types';
import { useExchangeRateStore } from '@/store/exchangeRateStore';

export interface NewPagoProveedorInput {
  proveedor: string;
  descripcion?: string;
  moneda: Moneda | string;
  monto_bs: number; // en centavos
  tasa_cambio: number;
  monto_usd: number; // en centavos
  fecha_pago: string; // ISO string o YYYY-MM-DD
  mes_asignado: string; // YYYY-MM ej. "2026-10"
}

export function useProveedores() {
  const db = useSQLiteContext();
  const { fetchBcvRate } = useExchangeRateStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [pagosProveedores, setPagosProveedores] = useState<PagoProveedor[]>([]);
  const [proveedoresList, setProveedoresList] = useState<string[]>([]);

  // Totales del mes asignado seleccionado
  const [totalMesUsd, setTotalMesUsd] = useState<number>(0);
  const [totalMesBs, setTotalMesBs] = useState<number>(0);
  const [cantidadMes, setCantidadMes] = useState<number>(0);

  // Totales generales
  const [totalGeneralUsd, setTotalGeneralUsd] = useState<number>(0);
  const [totalGeneralBs, setTotalGeneralBs] = useState<number>(0);
  const [cantidadGeneral, setCantidadGeneral] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPagosProveedores = useCallback(
    async (showLoading = true, targetDate: Date = selectedDate) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const targetYearMonth = `${year}-${month}`;

        // 1. Obtener pagos filtrados por el mes asignado
        const pagosStmt = await db.prepareAsync(`
          SELECT * FROM pagos_proveedores 
          WHERE mes_asignado = $yearMonth 
          ORDER BY datetime(fecha_pago) DESC, id DESC
        `);

        let rowsMes: PagoProveedor[] = [];
        try {
          const res = await pagosStmt.executeAsync<PagoProveedor>({ $yearMonth: targetYearMonth });
          rowsMes = await res.getAllAsync();
        } finally {
          await pagosStmt.finalizeAsync();
        }
        setPagosProveedores(rowsMes);

        // 2. Sumas del mes asignado seleccionado
        const totalUsd = rowsMes.reduce((acc, curr) => acc + curr.monto_usd, 0);
        const totalBs = rowsMes.reduce((acc, curr) => acc + curr.monto_bs, 0);
        setTotalMesUsd(totalUsd);
        setTotalMesBs(totalBs);
        setCantidadMes(rowsMes.length);

        // 3. Totales globales
        const globalRow = await db.getFirstAsync<{
          sum_usd: number;
          sum_bs: number;
          total_count: number;
        }>(`
          SELECT 
            COALESCE(SUM(monto_usd), 0) AS sum_usd,
            COALESCE(SUM(monto_bs), 0) AS sum_bs,
            COUNT(*) AS total_count
          FROM pagos_proveedores
        `);

        if (globalRow) {
          setTotalGeneralUsd(globalRow.sum_usd);
          setTotalGeneralBs(globalRow.sum_bs);
          setCantidadGeneral(globalRow.total_count);
        }

        // 4. Lista de nombres de proveedores distintos para autocompletado
        const provRows = await db.getAllAsync<{ proveedor: string }>(`
          SELECT DISTINCT proveedor 
          FROM pagos_proveedores 
          WHERE proveedor IS NOT NULL AND TRIM(proveedor) != ''
          ORDER BY proveedor ASC
          LIMIT 20
        `);
        setProveedoresList(provRows.map((r) => r.proveedor));
      } catch (err: any) {
        setError(err?.message || 'Error al cargar pagos a proveedores');
      } finally {
        setLoading(false);
      }
    },
    [db, selectedDate]
  );

  const insertPagoProveedor = useCallback(
    async (input: NewPagoProveedorInput): Promise<number> => {
      try {
        setError(null);
        const stmt = await db.prepareAsync(`
          INSERT INTO pagos_proveedores (
            proveedor,
            descripcion,
            moneda,
            monto_bs,
            tasa_cambio,
            monto_usd,
            fecha_pago,
            mes_asignado
          ) VALUES (
            $proveedor,
            $descripcion,
            $moneda,
            $monto_bs,
            $tasa_cambio,
            $monto_usd,
            $fecha_pago,
            $mes_asignado
          )
        `);

        let insertedId = 0;
        try {
          const res = await stmt.executeAsync({
            $proveedor: input.proveedor.trim(),
            $descripcion: input.descripcion ? input.descripcion.trim() : null,
            $moneda: input.moneda,
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_pago: input.fecha_pago || new Date().toISOString(),
            $mes_asignado: input.mes_asignado,
          });
          insertedId = res.lastInsertRowId;
        } finally {
          await stmt.finalizeAsync();
        }

        // Si el pago se asignó a un mes diferente del actualmente seleccionado,
        // podemos actualizar el mes seleccionado para ver el nuevo registro
        const [targetYear, targetMonth] = input.mes_asignado.split('-').map(Number);
        const targetDate = new Date(targetYear, targetMonth - 1, 1);
        setSelectedDate(targetDate);
        await fetchPagosProveedores(false, targetDate);

        return insertedId;
      } catch (err: any) {
        setError(err?.message || 'Error al registrar pago a proveedor');
        throw err;
      }
    },
    [db, fetchPagosProveedores]
  );

  const deletePagoProveedor = useCallback(
    async (id: number): Promise<void> => {
      try {
        setError(null);
        const stmt = await db.prepareAsync('DELETE FROM pagos_proveedores WHERE id = $id');
        try {
          await stmt.executeAsync({ $id: id });
        } finally {
          await stmt.finalizeAsync();
        }
        await fetchPagosProveedores(false, selectedDate);
      } catch (err: any) {
        setError(err?.message || 'Error al eliminar pago');
        throw err;
      }
    },
    [db, fetchPagosProveedores, selectedDate]
  );

  const changeMonth = useCallback(
    (delta: number) => {
      setSelectedDate((prev) => {
        const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
        fetchPagosProveedores(false, next);
        return next;
      });
    },
    [fetchPagosProveedores]
  );

  const resetToCurrentMonth = useCallback(() => {
    const now = new Date();
    setSelectedDate(now);
    fetchPagosProveedores(false, now);
  }, [fetchPagosProveedores]);

  useEffect(() => {
    fetchBcvRate();
    fetchPagosProveedores(true, selectedDate);
  }, [fetchBcvRate, fetchPagosProveedores]);

  useFocusEffect(
    useCallback(() => {
      fetchPagosProveedores(false, selectedDate);
    }, [fetchPagosProveedores, selectedDate])
  );

  const now = new Date();
  const isCurrentMonth =
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();

  return {
    pagosProveedores,
    proveedoresList,
    totalMesUsd,
    totalMesBs,
    cantidadMes,
    totalGeneralUsd,
    totalGeneralBs,
    cantidadGeneral,
    selectedDate,
    isCurrentMonth,
    loading,
    error,
    changeMonth,
    resetToCurrentMonth,
    fetchPagosProveedores,
    insertPagoProveedor,
    deletePagoProveedor,
  };
}
