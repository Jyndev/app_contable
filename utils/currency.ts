import Decimal from 'decimal.js';

/**
 * Convierte un monto flotante o string a centavos (entero) para almacenamiento seguro en SQLite.
 * Ejemplo: 19.99 -> 1999
 */
export function toCents(amount: number | string | Decimal): number {
  if (amount === '' || amount === undefined || amount === null) return 0;
  try {
    const sanitized = typeof amount === 'string' ? amount.replace(',', '.') : amount;
    const d = new Decimal(sanitized || 0);
    return d.times(100).round().toNumber();
  } catch {
    return 0;
  }
}

/**
 * Convierte centavos almacenados en SQLite a Decimal para operaciones matemáticas precisas.
 * Ejemplo: 1999 -> Decimal(19.99)
 */
export function fromCents(cents: number): Decimal {
  return new Decimal(cents || 0).dividedBy(100);
}

/**
 * Calcula centavos en USD a partir de centavos en BS y la tasa de cambio.
 * USD = (BS / tasa)
 */
export function calculateUsdFromBs(montoBsInCents: number, tasaCambio: number): number {
  if (!tasaCambio || tasaCambio <= 0 || !montoBsInCents) return 0;
  const bsDecimal = fromCents(montoBsInCents);
  const tasaDecimal = new Decimal(tasaCambio);
  const usdDecimal = bsDecimal.dividedBy(tasaDecimal);
  return usdDecimal.times(100).round().toNumber();
}

/**
 * Calcula centavos en BS a partir de centavos en USD y la tasa de cambio.
 * BS = (USD * tasa)
 */
export function calculateBsFromUsd(montoUsdInCents: number, tasaCambio: number): number {
  if (!tasaCambio || tasaCambio <= 0 || !montoUsdInCents) return 0;
  const usdDecimal = fromCents(montoUsdInCents);
  const tasaDecimal = new Decimal(tasaCambio);
  const bsDecimal = usdDecimal.times(tasaDecimal);
  return bsDecimal.times(100).round().toNumber();
}

/**
 * Formatea centavos a formato de moneda de Bolívares (Bs.).
 * Ejemplo: 150000 -> "Bs. 1.500,00"
 */
export function formatBs(amountInCents: number): string {
  const decimalAmount = fromCents(amountInCents).toNumber();
  const formattedNumber = new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimalAmount);
  return `Bs. ${formattedNumber}`;
}

/**
 * Formatea centavos a formato de moneda de Dólares ($).
 * Ejemplo: 2550 -> "$25.50"
 */
export function formatUsd(amountInCents: number): string {
  const decimalAmount = fromCents(amountInCents).toNumber();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimalAmount);
}

/**
 * Formatea un monto genérico según la moneda indicada ('BS' o 'USD').
 */
export function formatAmountByCurrency(amountInCents: number, currency: string = 'USD'): string {
  if (currency.toUpperCase() === 'BS' || currency.toUpperCase() === 'VES') {
    return formatBs(amountInCents);
  }
  return formatUsd(amountInCents);
}

/**
 * Realiza sumas seguras sobre un array de montos en centavos.
 */
export function sumCents(centsList: number[]): number {
  return centsList.reduce((acc, curr) => acc + (curr || 0), 0);
}

/**
 * Formatea una fecha ISO a formato amigable de fecha y hora.
 */
export function formatFriendlyDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
