import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { Gasto, DeudaConSaldo } from '@/database/types';
import { calculateBsFromUsd, calculateUsdFromBs } from '@/utils/currency';
import { useExchangeRateStore } from '@/store/exchangeRateStore';

export interface MonthlyPaymentsStats {
  totalPagosUsd: number; // en centavos
  totalPagosBs: number; // en centavos
  cantidadPagos: number;
}

export interface DashboardStats {
  // Deudas pendientes globales
  totalDeudasPendientesUsd: number; // en centavos
  totalDeudasPendientesBs: number; // en centavos
  totalDeudasOriginalUsd: number; // en centavos
  totalDeudasOriginalBs: number; // en centavos
  porcentajeRestanteDeuda: number; // 0 - 100 (%)
  porcentajePagadoDeuda: number; // 0 - 100 (%)
  cantidadDeudasPendientes: number;

  // Gastos del mes seleccionado
  totalGastosMesBs: number; // en centavos
  totalGastosMesUsd: number; // en centavos
  cantidadGastosMes: number;

  // Gastos generales / históricos
  totalGastosGeneralBs: number; // en centavos
  totalGastosGeneralUsd: number; // en centavos
  cantidadGastosGeneral: number;

  // Pagos a proveedores en el mes seleccionado
  totalProveedoresMesUsd: number; // en centavos
  totalProveedoresMesBs: number; // en centavos
  cantidadProveedoresMes: number;

  // Objetivos de Ahorro
  totalAhorradoGeneralUsd: number; // en centavos
  totalAhorradoGeneralBs: number; // en centavos
  totalObjetivoGeneralUsd: number; // en centavos
  totalObjetivoGeneralBs: number; // en centavos
  porcentajeGlobalAhorro: number; // 0 - 100 (%)
  cantidadAhorrosActivos: number;

  // Pagos realizados a deudas en el mes seleccionado
  monthlyPayments: MonthlyPaymentsStats;

  // Historial reciente
  ultimosGastos: Gasto[];
  deudasActivas: DeudaConSaldo[];
}

export function useDashboard() {
  const db = useSQLiteContext();
  const { fetchBcvRate } = useExchangeRateStore();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [stats, setStats] = useState<DashboardStats>({
    totalDeudasPendientesUsd: 0,
    totalDeudasPendientesBs: 0,
    totalDeudasOriginalUsd: 0,
    totalDeudasOriginalBs: 0,
    porcentajeRestanteDeuda: 0,
    porcentajePagadoDeuda: 0,
    cantidadDeudasPendientes: 0,
    totalGastosMesBs: 0,
    totalGastosMesUsd: 0,
    cantidadGastosMes: 0,
    totalGastosGeneralBs: 0,
    totalGastosGeneralUsd: 0,
    cantidadGastosGeneral: 0,
    totalProveedoresMesUsd: 0,
    totalProveedoresMesBs: 0,
    cantidadProveedoresMes: 0,
    totalAhorradoGeneralUsd: 0,
    totalAhorradoGeneralBs: 0,
    totalObjetivoGeneralUsd: 0,
    totalObjetivoGeneralBs: 0,
    porcentajeGlobalAhorro: 0,
    cantidadAhorrosActivos: 0,
    monthlyPayments: {
      totalPagosUsd: 0,
      totalPagosBs: 0,
      cantidadPagos: 0,
    },
    ultimosGastos: [],
    deudasActivas: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async (showLoading = true, targetDate: Date = selectedDate) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      // 1. Obtener año y mes para el filtro (ej. "2026-09")
      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const targetYearMonth = `${year}-${month}`;
      const yearMonthLike = `${targetYearMonth}%`;

      // 2. Consulta SQL: Pagos a deudas realizados en el mes seleccionado
      const pagosMesStmt = await db.prepareAsync(`
        SELECT 
          COALESCE(SUM(monto_usd), 0) AS total_pagos_usd,
          COALESCE(SUM(monto_bs), 0) AS total_pagos_bs,
          COUNT(*) AS total_pagos_count
        FROM pagos
        WHERE substr(fecha_pago, 1, 7) = $yearMonth OR fecha_pago LIKE $yearMonthLike
      `);

      let totalPagosUsd = 0;
      let totalPagosBs = 0;
      let cantidadPagos = 0;

      try {
        const res = await pagosMesStmt.executeAsync<{
          total_pagos_usd: number;
          total_pagos_bs: number;
          total_pagos_count: number;
        }>({ $yearMonth: targetYearMonth, $yearMonthLike: yearMonthLike });
        const row = await res.getFirstAsync();
        if (row) {
          totalPagosUsd = row.total_pagos_usd;
          totalPagosBs = row.total_pagos_bs;
          cantidadPagos = row.total_pagos_count;
        }
      } finally {
        await pagosMesStmt.finalizeAsync();
      }

      // 3. Consulta SQL: Gastos del mes seleccionado
      const gastosMesStmt = await db.prepareAsync(`
        SELECT 
          COALESCE(SUM(monto_bs), 0) AS total_bs,
          COALESCE(SUM(monto_usd), 0) AS total_usd,
          COUNT(*) AS total_count
        FROM gastos
        WHERE substr(fecha_gasto, 1, 7) = $yearMonth OR fecha_gasto LIKE $yearMonthLike
      `);

      let totalGastosMesBs = 0;
      let totalGastosMesUsd = 0;
      let cantidadGastosMes = 0;

      try {
        const res = await gastosMesStmt.executeAsync<{
          total_bs: number;
          total_usd: number;
          total_count: number;
        }>({ $yearMonth: targetYearMonth, $yearMonthLike: yearMonthLike });
        const row = await res.getFirstAsync();
        if (row) {
          totalGastosMesBs = row.total_bs;
          totalGastosMesUsd = row.total_usd;
          cantidadGastosMes = row.total_count;
        }
      } finally {
        await gastosMesStmt.finalizeAsync();
      }

      // 4. Consulta SQL: Gastos totales históricos
      let totalGastosGeneralBs = 0;
      let totalGastosGeneralUsd = 0;
      let cantidadGastosGeneral = 0;

      const gastosGeneralRow = await db.getFirstAsync<{
        total_bs: number;
        total_usd: number;
        total_count: number;
      }>(`
        SELECT 
          COALESCE(SUM(monto_bs), 0) AS total_bs,
          COALESCE(SUM(monto_usd), 0) AS total_usd,
          COUNT(*) AS total_count
        FROM gastos
      `);

      if (gastosGeneralRow) {
        totalGastosGeneralBs = gastosGeneralRow.total_bs;
        totalGastosGeneralUsd = gastosGeneralRow.total_usd;
        cantidadGastosGeneral = gastosGeneralRow.total_count;
      }

      // 5. Consulta SQL: Pagos a Proveedores en el mes seleccionado
      let totalProveedoresMesUsd = 0;
      let totalProveedoresMesBs = 0;
      let cantidadProveedoresMes = 0;

      const provStmt = await db.prepareAsync(`
        SELECT 
          COALESCE(SUM(monto_usd), 0) AS total_usd,
          COALESCE(SUM(monto_bs), 0) AS total_bs,
          COUNT(*) AS total_count
        FROM pagos_proveedores
        WHERE mes_asignado = $yearMonth OR substr(fecha_pago, 1, 7) = $yearMonth OR fecha_pago LIKE $yearMonthLike
      `);

      try {
        const res = await provStmt.executeAsync<{
          total_usd: number;
          total_bs: number;
          total_count: number;
        }>({ $yearMonth: targetYearMonth, $yearMonthLike: yearMonthLike });
        const row = await res.getFirstAsync();
        if (row) {
          totalProveedoresMesUsd = row.total_usd;
          totalProveedoresMesBs = row.total_bs;
          cantidadProveedoresMes = row.total_count;
        }
      } finally {
        await provStmt.finalizeAsync();
      }

      // 6. Consulta SQL: Deudas activas y cálculo de saldos en USD y BS
      const deudasQuery = `
        SELECT 
          d.id,
          d.concepto,
          d.monto_total,
          d.moneda,
          COALESCE(d.monto_bs, 0) AS monto_bs,
          COALESCE(d.tasa_cambio, 1.0) AS tasa_cambio,
          COALESCE(d.monto_usd, 0) AS monto_usd,
          d.fecha_creacion,
          d.estado,
          COALESCE(SUM(p.monto_pago), 0) AS total_pagado,
          (d.monto_total - COALESCE(SUM(p.monto_pago), 0)) AS saldo_pendiente
        FROM deudas d
        LEFT JOIN pagos p ON d.id = p.deuda_id
        WHERE d.estado = 'PENDIENTE'
        GROUP BY d.id
        HAVING saldo_pendiente > 0
        ORDER BY datetime(d.fecha_creacion) DESC
      `;
      const rawDeudas = await db.getAllAsync<any>(deudasQuery);

      let totalDeudasOriginalUsd = 0;
      let totalDeudasOriginalBs = 0;

      const deudasActivas: DeudaConSaldo[] = rawDeudas.map((row) => {
        const saldo = Math.max(0, row.saldo_pendiente);
        const rate = Number(row.tasa_cambio) > 0 ? Number(row.tasa_cambio) : 1;
        const isBs = row.moneda === 'BS';

        const montoOriginalBs = isBs ? row.monto_total : calculateBsFromUsd(row.monto_total, rate);
        const montoOriginalUsd = isBs ? calculateUsdFromBs(row.monto_total, rate) : row.monto_total;

        totalDeudasOriginalUsd += montoOriginalUsd;
        totalDeudasOriginalBs += montoOriginalBs;

        return {
          ...row,
          saldo_pendiente: saldo,
          saldo_pendiente_bs: isBs ? saldo : calculateBsFromUsd(saldo, rate),
          saldo_pendiente_usd: isBs ? calculateUsdFromBs(saldo, rate) : saldo,
        };
      });

      const totalDeudasPendientesUsd = deudasActivas.reduce(
        (acc, curr) => acc + curr.saldo_pendiente_usd,
        0
      );

      const totalDeudasPendientesBs = deudasActivas.reduce(
        (acc, curr) => acc + curr.saldo_pendiente_bs,
        0
      );

      const porcentajeRestanteDeuda =
        totalDeudasOriginalUsd > 0
          ? Math.min(100, Math.max(0, Math.round((totalDeudasPendientesUsd / totalDeudasOriginalUsd) * 100)))
          : 0;

      const porcentajePagadoDeuda = 100 - porcentajeRestanteDeuda;

      // 7. Objetivos de Ahorro
      const ahorrosQuery = `
        SELECT 
          a.id,
          a.titulo,
          a.monto_objetivo,
          a.moneda,
          COALESCE(a.monto_bs, 0) AS monto_bs,
          COALESCE(a.tasa_cambio, 1.0) AS tasa_cambio,
          COALESCE(a.monto_usd, 0) AS monto_usd,
          a.estado,
          COALESCE(SUM(ap.monto_aporte), 0) AS total_ahorrado
        FROM ahorros a
        LEFT JOIN aportes_ahorro ap ON a.id = ap.ahorro_id
        GROUP BY a.id
      `;
      let totalAhorradoGeneralUsd = 0;
      let totalAhorradoGeneralBs = 0;
      let totalObjetivoGeneralUsd = 0;
      let totalObjetivoGeneralBs = 0;
      let cantidadAhorrosActivos = 0;

      try {
        const rawAhorros = await db.getAllAsync<any>(ahorrosQuery);
        for (const a of rawAhorros) {
          const rate = Number(a.tasa_cambio) > 0 ? Number(a.tasa_cambio) : 1;
          const isBs = a.moneda === 'BS';
          const ahorrado = Math.max(0, a.total_ahorrado || 0);
          const objetivo = a.monto_objetivo > 0 ? a.monto_objetivo : 1;

          const aUsd = isBs ? calculateUsdFromBs(ahorrado, rate) : ahorrado;
          const aBs = isBs ? ahorrado : calculateBsFromUsd(ahorrado, rate);
          const oUsd = isBs ? calculateUsdFromBs(objetivo, rate) : objetivo;
          const oBs = isBs ? objetivo : calculateBsFromUsd(objetivo, rate);

          totalAhorradoGeneralUsd += aUsd;
          totalAhorradoGeneralBs += aBs;
          totalObjetivoGeneralUsd += oUsd;
          totalObjetivoGeneralBs += oBs;

          if (a.estado === 'EN_PROGRESO' && ahorrado < objetivo) {
            cantidadAhorrosActivos++;
          }
        }
      } catch {
        // En caso de que las tablas aún se estén creando
      }

      const porcentajeGlobalAhorro =
        totalObjetivoGeneralUsd > 0
          ? Math.min(100, Math.max(0, Math.round((totalAhorradoGeneralUsd / totalObjetivoGeneralUsd) * 100)))
          : 0;

      // 8. Últimos 5 gastos
      const ultimosGastos = await db.getAllAsync<Gasto>(
        'SELECT * FROM gastos ORDER BY datetime(fecha_gasto) DESC, id DESC LIMIT 5'
      );

      setStats({
        totalDeudasPendientesUsd,
        totalDeudasPendientesBs,
        totalDeudasOriginalUsd,
        totalDeudasOriginalBs,
        porcentajeRestanteDeuda,
        porcentajePagadoDeuda,
        cantidadDeudasPendientes: deudasActivas.length,
        totalGastosMesBs,
        totalGastosMesUsd,
        cantidadGastosMes,
        totalGastosGeneralBs,
        totalGastosGeneralUsd,
        cantidadGastosGeneral,
        totalProveedoresMesUsd,
        totalProveedoresMesBs,
        cantidadProveedoresMes,
        totalAhorradoGeneralUsd,
        totalAhorradoGeneralBs,
        totalObjetivoGeneralUsd,
        totalObjetivoGeneralBs,
        porcentajeGlobalAhorro,
        cantidadAhorrosActivos,
        monthlyPayments: {
          totalPagosUsd,
          totalPagosBs,
          cantidadPagos,
        },
        ultimosGastos,
        deudasActivas: deudasActivas,
      });
    } catch (err: any) {
      setError(err?.message || 'Error al cargar datos del dashboard');
    } finally {
      setLoading(false);
    }
  }, [db, selectedDate]);

  const changeMonth = useCallback((delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      fetchDashboardData(false, next);
      return next;
    });
  }, [fetchDashboardData]);

  const resetToCurrentMonth = useCallback(() => {
    const now = new Date();
    setSelectedDate(now);
    fetchDashboardData(false, now);
  }, [fetchDashboardData]);

  useEffect(() => {
    // Sincronizar tasa BCV al montar la pantalla
    fetchBcvRate();
    fetchDashboardData(true, selectedDate);
  }, [fetchBcvRate, fetchDashboardData]);

  // Recarga automática cada vez que la pantalla de inicio obtiene el foco
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(false, selectedDate);
    }, [fetchDashboardData, selectedDate])
  );

  const now = new Date();
  const isCurrentMonth =
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear();

  return {
    stats,
    loading,
    error,
    selectedDate,
    isCurrentMonth,
    changeMonth,
    resetToCurrentMonth,
    refreshDashboard: async () => {
      await fetchBcvRate(false);
      await fetchDashboardData(true, selectedDate);
    },
    fetchDashboardData,
    db,
  };
}
