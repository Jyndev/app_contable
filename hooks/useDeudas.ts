import { useState, useCallback, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { Deuda, Pago, DeudaConSaldo, Moneda, EstadoDeuda } from '@/database/types';
import { sumCents, calculateBsFromUsd, calculateUsdFromBs } from '@/utils/currency';

export interface NewDeudaInput {
  concepto: string;
  monto_total: number; // en centavos
  moneda: Moneda | string;
  monto_bs: number; // en centavos de BS
  tasa_cambio: number;
  monto_usd: number; // en centavos de USD
  fecha_creacion?: string;
}

export interface NewPagoInput {
  deuda_id: number;
  monto_pago: number; // en centavos en la moneda base
  monto_bs: number; // en centavos de BS
  tasa_cambio: number;
  monto_usd: number; // en centavos de USD
  fecha_pago?: string;
}

export interface DeudaDetalleResponse {
  deuda: DeudaConSaldo | null;
  pagos: Pago[];
}

export function useDeudas() {
  const db = useSQLiteContext();
  const [deudas, setDeudas] = useState<DeudaConSaldo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Consulta todas las deudas calculando el total pagado y saldo pendiente en ambas monedas.
   */
  const fetchDeudas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const query = `
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
        GROUP BY d.id
        ORDER BY 
          CASE WHEN d.estado = 'PENDIENTE' THEN 0 ELSE 1 END,
          datetime(d.fecha_creacion) DESC,
          d.id DESC
      `;

      const rawRows = await db.getAllAsync<any>(query);

      const computed: DeudaConSaldo[] = rawRows.map((row) => {
        const saldo = Math.max(0, row.saldo_pendiente);
        const rate = Number(row.tasa_cambio) > 0 ? Number(row.tasa_cambio) : 1;
        const isBs = row.moneda === 'BS';

        const saldo_pendiente_bs = isBs ? saldo : calculateBsFromUsd(saldo, rate);
        const saldo_pendiente_usd = isBs ? calculateUsdFromBs(saldo, rate) : saldo;

        return {
          ...row,
          saldo_pendiente: saldo,
          saldo_pendiente_bs,
          saldo_pendiente_usd,
        };
      });

      setDeudas(computed);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las deudas');
    } finally {
      setLoading(false);
    }
  }, [db]);

  /**
   * Inserta una nueva deuda con montos en BS, USD y Tasa de Cambio asociada.
   */
  const insertDeuda = useCallback(
    async (input: NewDeudaInput): Promise<number> => {
      try {
        setError(null);
        const fecha = input.fecha_creacion || new Date().toISOString();

        const statement = await db.prepareAsync(
          `INSERT INTO deudas 
            (concepto, monto_total, moneda, monto_bs, tasa_cambio, monto_usd, fecha_creacion, estado) 
           VALUES 
            ($concepto, $monto_total, $moneda, $monto_bs, $tasa_cambio, $monto_usd, $fecha_creacion, $estado)`
        );

        try {
          const result = await statement.executeAsync({
            $concepto: input.concepto.trim(),
            $monto_total: input.monto_total,
            $moneda: input.moneda || 'USD',
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_creacion: fecha,
            $estado: 'PENDIENTE',
          });

          await fetchDeudas();
          return result.lastInsertRowId;
        } finally {
          await statement.finalizeAsync();
        }
      } catch (err: any) {
        setError(err?.message || 'Error al registrar la deuda');
        throw err;
      }
    },
    [db, fetchDeudas]
  );

  /**
   * Obtiene el detalle completo de una deuda específica junto con su historial de pagos y conversiones.
   */
  const getDeudaDetalle = useCallback(
    async (deudaId: number): Promise<DeudaDetalleResponse> => {
      try {
        const deudaStmt = await db.prepareAsync(`
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
          WHERE d.id = $id
          GROUP BY d.id
        `);

        let deuda: DeudaConSaldo | null = null;
        try {
          const resDeuda = await deudaStmt.executeAsync<any>({ $id: deudaId });
          const row = await resDeuda.getFirstAsync();
          if (row) {
            const saldo = Math.max(0, row.saldo_pendiente);
            const rate = Number(row.tasa_cambio) > 0 ? Number(row.tasa_cambio) : 1;
            const isBs = row.moneda === 'BS';

            deuda = {
              ...row,
              saldo_pendiente: saldo,
              saldo_pendiente_bs: isBs ? saldo : calculateBsFromUsd(saldo, rate),
              saldo_pendiente_usd: isBs ? calculateUsdFromBs(saldo, rate) : saldo,
            };
          }
        } finally {
          await deudaStmt.finalizeAsync();
        }

        if (!deuda) {
          return { deuda: null, pagos: [] };
        }

        const pagosStmt = await db.prepareAsync(`
          SELECT 
            id, 
            deuda_id, 
            monto_pago, 
            COALESCE(monto_bs, 0) AS monto_bs, 
            COALESCE(tasa_cambio, 1.0) AS tasa_cambio, 
            COALESCE(monto_usd, 0) AS monto_usd, 
            fecha_pago
          FROM pagos
          WHERE deuda_id = $deuda_id
          ORDER BY datetime(fecha_pago) DESC, id DESC
        `);

        let pagos: Pago[] = [];
        try {
          const resPagos = await pagosStmt.executeAsync<Pago>({ $deuda_id: deudaId });
          pagos = await resPagos.getAllAsync();
        } finally {
          await pagosStmt.finalizeAsync();
        }

        return { deuda, pagos };
      } catch (err: any) {
        throw new Error(err?.message || 'Error al obtener detalle de la deuda');
      }
    },
    [db]
  );

  /**
   * Inserta un pago con montos en BS, USD y tasa de cambio aplicada.
   */
  const insertPago = useCallback(
    async (input: NewPagoInput): Promise<number> => {
      try {
        setError(null);
        const fecha = input.fecha_pago || new Date().toISOString();

        const pagoStmt = await db.prepareAsync(
          `INSERT INTO pagos 
            (deuda_id, monto_pago, monto_bs, tasa_cambio, monto_usd, fecha_pago) 
           VALUES 
            ($deuda_id, $monto_pago, $monto_bs, $tasa_cambio, $monto_usd, $fecha_pago)`
        );

        let pagoId = 0;
        try {
          const res = await pagoStmt.executeAsync({
            $deuda_id: input.deuda_id,
            $monto_pago: input.monto_pago,
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_pago: fecha,
          });
          pagoId = res.lastInsertRowId;
        } finally {
          await pagoStmt.finalizeAsync();
        }

        // Comprobar si la deuda quedó saldada
        const saldoCheckStmt = await db.prepareAsync(`
          SELECT 
            d.monto_total,
            COALESCE(SUM(p.monto_pago), 0) AS total_pagado
          FROM deudas d
          LEFT JOIN pagos p ON d.id = p.deuda_id
          WHERE d.id = $id
          GROUP BY d.id
        `);

        try {
          const resSaldo = await saldoCheckStmt.executeAsync<{
            monto_total: number;
            total_pagado: number;
          }>({ $id: input.deuda_id });
          const row = await resSaldo.getFirstAsync();

          if (row && row.total_pagado >= row.monto_total) {
            const updateStmt = await db.prepareAsync(
              "UPDATE deudas SET estado = 'PAGADA' WHERE id = $id"
            );
            try {
              await updateStmt.executeAsync({ $id: input.deuda_id });
            } finally {
              await updateStmt.finalizeAsync();
            }
          }
        } finally {
          await saldoCheckStmt.finalizeAsync();
        }

        await fetchDeudas();
        return pagoId;
      } catch (err: any) {
        setError(err?.message || 'Error al registrar el pago');
        throw err;
      }
    },
    [db, fetchDeudas]
  );

  /**
   * Actualiza un pago existente y recalcula el estado de la deuda.
   */
  const updatePago = useCallback(
    async (pagoId: number, deudaId: number, input: NewPagoInput): Promise<void> => {
      try {
        setError(null);
        const fecha = input.fecha_pago || new Date().toISOString();

        const pagoStmt = await db.prepareAsync(
          `UPDATE pagos 
           SET monto_pago = $monto_pago,
               monto_bs = $monto_bs,
               tasa_cambio = $tasa_cambio,
               monto_usd = $monto_usd,
               fecha_pago = $fecha_pago
           WHERE id = $id AND deuda_id = $deuda_id`
        );

        try {
          await pagoStmt.executeAsync({
            $id: pagoId,
            $deuda_id: deudaId,
            $monto_pago: input.monto_pago,
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
            $fecha_pago: fecha,
          });
        } finally {
          await pagoStmt.finalizeAsync();
        }

        // Recalcular estado de la deuda
        const saldoCheckStmt = await db.prepareAsync(`
          SELECT 
            d.monto_total,
            COALESCE(SUM(p.monto_pago), 0) AS total_pagado
          FROM deudas d
          LEFT JOIN pagos p ON d.id = p.deuda_id
          WHERE d.id = $id
          GROUP BY d.id
        `);

        try {
          const resSaldo = await saldoCheckStmt.executeAsync<{
            monto_total: number;
            total_pagado: number;
          }>({ $id: deudaId });
          const row = await resSaldo.getFirstAsync();

          if (row) {
            const nuevoEstado = row.total_pagado >= row.monto_total ? 'PAGADA' : 'PENDIENTE';
            const updateStmt = await db.prepareAsync(
              'UPDATE deudas SET estado = $estado WHERE id = $id'
            );
            try {
              await updateStmt.executeAsync({ $id: deudaId, $estado: nuevoEstado });
            } finally {
              await updateStmt.finalizeAsync();
            }
          }
        } finally {
          await saldoCheckStmt.finalizeAsync();
        }

        await fetchDeudas();
      } catch (err: any) {
        setError(err?.message || 'Error al actualizar el abono');
        throw err;
      }
    },
    [db, fetchDeudas]
  );

  /**
   * Actualiza los datos principales de una deuda y recalcula el estado.
   */
  const updateDeuda = useCallback(
    async (id: number, input: NewDeudaInput): Promise<void> => {
      try {
        setError(null);
        const statement = await db.prepareAsync(
          `UPDATE deudas 
           SET concepto = $concepto,
               monto_total = $monto_total,
               moneda = $moneda,
               monto_bs = $monto_bs,
               tasa_cambio = $tasa_cambio,
               monto_usd = $monto_usd
           WHERE id = $id`
        );

        try {
          await statement.executeAsync({
            $id: id,
            $concepto: input.concepto.trim(),
            $monto_total: input.monto_total,
            $moneda: input.moneda || 'USD',
            $monto_bs: input.monto_bs,
            $tasa_cambio: input.tasa_cambio,
            $monto_usd: input.monto_usd,
          });
        } finally {
          await statement.finalizeAsync();
        }

        // Recalcular estado
        const saldoCheckStmt = await db.prepareAsync(`
          SELECT 
            d.monto_total,
            COALESCE(SUM(p.monto_pago), 0) AS total_pagado
          FROM deudas d
          LEFT JOIN pagos p ON d.id = p.deuda_id
          WHERE d.id = $id
          GROUP BY d.id
        `);

        try {
          const resSaldo = await saldoCheckStmt.executeAsync<{
            monto_total: number;
            total_pagado: number;
          }>({ $id: id });
          const row = await resSaldo.getFirstAsync();

          if (row) {
            const nuevoEstado = row.total_pagado >= row.monto_total ? 'PAGADA' : 'PENDIENTE';
            const updateStmt = await db.prepareAsync(
              'UPDATE deudas SET estado = $estado WHERE id = $id'
            );
            try {
              await updateStmt.executeAsync({ $id: id, $estado: nuevoEstado });
            } finally {
              await updateStmt.finalizeAsync();
            }
          }
        } finally {
          await saldoCheckStmt.finalizeAsync();
        }

        await fetchDeudas();
      } catch (err: any) {
        setError(err?.message || 'Error al actualizar la deuda');
        throw err;
      }
    },
    [db, fetchDeudas]
  );

  /**
   * Elimina un pago y actualiza el estado.
   */
  const deletePago = useCallback(
    async (pagoId: number, deudaId: number): Promise<void> => {
      try {
        setError(null);
        const delStmt = await db.prepareAsync('DELETE FROM pagos WHERE id = $id');
        try {
          await delStmt.executeAsync({ $id: pagoId });
        } finally {
          await delStmt.finalizeAsync();
        }

        const checkStmt = await db.prepareAsync(`
          SELECT 
            d.monto_total,
            COALESCE(SUM(p.monto_pago), 0) AS total_pagado
          FROM deudas d
          LEFT JOIN pagos p ON d.id = p.deuda_id
          WHERE d.id = $id
          GROUP BY d.id
        `);

        try {
          const resCheck = await checkStmt.executeAsync<{
            monto_total: number;
            total_pagado: number;
          }>({ $id: deudaId });
          const row = await resCheck.getFirstAsync();

          if (row && row.total_pagado < row.monto_total) {
            const updateStmt = await db.prepareAsync(
              "UPDATE deudas SET estado = 'PENDIENTE' WHERE id = $id"
            );
            try {
              await updateStmt.executeAsync({ $id: deudaId });
            } finally {
              await updateStmt.finalizeAsync();
            }
          }
        } finally {
          await checkStmt.finalizeAsync();
        }

        await fetchDeudas();
      } catch (err: any) {
        setError(err?.message || 'Error al eliminar el pago');
        throw err;
      }
    },
    [db, fetchDeudas]
  );

  const deleteDeuda = useCallback(
    async (id: number): Promise<void> => {
      try {
        setError(null);
        const statement = await db.prepareAsync('DELETE FROM deudas WHERE id = $id');
        try {
          await statement.executeAsync({ $id: id });
          await fetchDeudas();
        } finally {
          await statement.finalizeAsync();
        }
      } catch (err: any) {
        setError(err?.message || 'Error al eliminar la deuda');
        throw err;
      }
    },
    [db, fetchDeudas]
  );

  useEffect(() => {
    fetchDeudas();
  }, [fetchDeudas]);

  const totalDeudasPendientesUsd = sumCents(
    deudas.filter((d) => d.estado === 'PENDIENTE').map((d) => d.saldo_pendiente_usd)
  );

  const totalDeudasPendientesBs = sumCents(
    deudas.filter((d) => d.estado === 'PENDIENTE').map((d) => d.saldo_pendiente_bs)
  );

  return {
    deudas,
    loading,
    error,
    fetchDeudas,
    insertDeuda,
    updateDeuda,
    getDeudaDetalle,
    insertPago,
    updatePago,
    deletePago,
    deleteDeuda,
    totalDeudasPendientesUsd,
    totalDeudasPendientesBs,
  };
}
