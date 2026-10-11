import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExchangeRateSource = 'bcv' | 'manual';

export interface ExchangeRateState {
  rate: number; // Tasa en Bolívares por USD (ej. 36.50)
  lastUpdated: string | null; // ISO 8601 string
  source: ExchangeRateSource;
  isManual: boolean;
  isLoading: boolean;
  error: string | null;

  // Acciones
  setRate: (rate: number) => void;
  setManualRate: (rate: number) => void;
  fetchBcvRate: (force?: boolean) => Promise<number | null>;
  resetToBcv: () => Promise<number | null>;
  resetRate: () => void;
}

const DEFAULT_RATE = 1.0;
const DOLAR_API_BCV_URL = 'https://ve.dolarapi.com/v1/dolares/oficial';

export const useExchangeRateStore = create<ExchangeRateState>()(
  persist(
    (set, get) => ({
      rate: DEFAULT_RATE,
      lastUpdated: null,
      source: 'bcv',
      isManual: false,
      isLoading: false,
      error: null,

      setRate: (rate: number) => {
        const validRate = Number(rate) > 0 ? Number(rate) : 1;
        set({
          rate: validRate,
          lastUpdated: new Date().toISOString(),
        });
      },

      setManualRate: (rate: number) => {
        const validRate = Number(rate) > 0 ? Number(rate) : 1;
        set({
          rate: validRate,
          lastUpdated: new Date().toISOString(),
          source: 'manual',
          isManual: true,
          error: null,
        });
      },

      fetchBcvRate: async (force = false) => {
        const state = get();
        // Si el usuario configuró una tasa manual y no se fuerza la actualización, conservarla
        if (state.isManual && !force) {
          return state.rate;
        }

        set({ isLoading: true, error: null });

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(DOLAR_API_BCV_URL, {
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            },
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Error al consultar tasa BCV`);
          }

          const data = await response.json();
          const bcvPromedio = typeof data?.promedio === 'number' ? data.promedio : parseFloat(data?.promedio);

          if (!bcvPromedio || isNaN(bcvPromedio) || bcvPromedio <= 0) {
            throw new Error('Respuesta inválida de la API BCV');
          }

          set({
            rate: bcvPromedio,
            lastUpdated: data?.fechaActualizacion || new Date().toISOString(),
            source: 'bcv',
            isManual: false,
            isLoading: false,
            error: null,
          });

          return bcvPromedio;
        } catch (err: any) {
          const errorMessage = err?.name === 'AbortError'
            ? 'Tiempo de espera agotado al consultar BCV'
            : err?.message || 'Error de conexión con la API de tasas';

          set({
            isLoading: false,
            error: errorMessage,
          });

          return null;
        }
      },

      resetToBcv: async () => {
        set({ isManual: false });
        return await get().fetchBcvRate(true);
      },

      resetRate: () =>
        set({
          rate: DEFAULT_RATE,
          lastUpdated: null,
          source: 'bcv',
          isManual: false,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: 'exchange-rate-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
