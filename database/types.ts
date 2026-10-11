export type Moneda = 'USD' | 'BS';
export type EstadoDeuda = 'PENDIENTE' | 'PAGADA' | 'CANCELADA';

export interface Deuda {
  id: number;
  concepto: string;
  monto_total: number; // Monto principal en centavos
  moneda: Moneda | string;
  monto_bs: number; // Equivalente/Monto en centavos de Bolívares
  tasa_cambio: number; // Tasa de cambio registrada (ej. 36.50)
  monto_usd: number; // Equivalente/Monto en centavos de Dólares
  fecha_creacion: string; // ISO 8601
  estado: EstadoDeuda;
}

export interface Pago {
  id: number;
  deuda_id: number;
  monto_pago: number; // Monto en centavos en la moneda base de la deuda
  monto_bs: number; // Monto equivalente en centavos de BS
  tasa_cambio: number; // Tasa aplicada al momento del abono
  monto_usd: number; // Monto equivalente en centavos de USD
  fecha_pago: string; // ISO 8601
}

export interface Gasto {
  id: number;
  categoria: string;
  descripcion?: string | null;
  moneda?: Moneda | string;
  monto_bs: number; // Monto en centavos de Bolívares
  tasa_cambio: number; // Tasa aplicada en el momento del gasto
  monto_usd: number; // Monto equivalente en centavos de Dólar
  fecha_gasto: string; // ISO 8601
}

export interface DeudaConSaldo extends Deuda {
  total_pagado: number; // En centavos
  saldo_pendiente: number; // En centavos
  saldo_pendiente_bs: number; // Saldo pendiente equivalente en BS (en centavos)
  saldo_pendiente_usd: number; // Saldo pendiente equivalente en USD (en centavos)
}

export interface PagoProveedor {
  id: number;
  proveedor: string;
  descripcion?: string | null;
  moneda: Moneda | string;
  monto_bs: number; // Monto en centavos de Bolívares
  tasa_cambio: number; // Tasa aplicada
  monto_usd: number; // Monto en centavos de Dólares
  fecha_pago: string; // ISO string o YYYY-MM-DD
  mes_asignado: string; // YYYY-MM ej. "2026-10"
}

export type EstadoAhorro = 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO';

export interface Ahorro {
  id: number;
  titulo: string;
  monto_objetivo: number; // En centavos
  moneda: Moneda | string;
  monto_bs: number; // En centavos de BS
  tasa_cambio: number;
  monto_usd: number; // En centavos de USD
  fecha_creacion: string; // ISO 8601
  fecha_limite?: string | null;
  categoria?: string | null;
  estado: EstadoAhorro;
}

export interface AporteAhorro {
  id: number;
  ahorro_id: number;
  monto_aporte: number; // En centavos en la moneda base del ahorro
  monto_bs: number;
  tasa_cambio: number;
  monto_usd: number;
  fecha_aporte: string; // ISO 8601
  nota?: string | null;
}

export interface AhorroConProgreso extends Ahorro {
  total_ahorrado: number; // En centavos
  saldo_restante: number; // En centavos
  porcentaje_progreso: number; // 0 - 100+
  total_ahorrado_bs: number;
  total_ahorrado_usd: number;
  saldo_restante_bs: number;
  saldo_restante_usd: number;
  monto_objetivo_bs: number;
  monto_objetivo_usd: number;
}

