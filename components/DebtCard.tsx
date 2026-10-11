import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DeudaConSaldo } from '@/database/types';
import {
  formatBs,
  formatUsd,
  formatFriendlyDate,
  calculateBsFromUsd,
  calculateUsdFromBs,
} from '@/utils/currency';
import { AppText } from '@/components/AppText';

interface DebtCardProps {
  deuda: DeudaConSaldo;
}

export function DebtCard({ deuda }: DebtCardProps) {
  const isPaid = deuda.estado === 'PAGADA' || deuda.saldo_pendiente <= 0;
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((deuda.total_pagado / (deuda.monto_total || 1)) * 100))
  );

  const rate = deuda.tasa_cambio > 0 ? deuda.tasa_cambio : 1;
  const isBs = deuda.moneda === 'BS';

  const saldoUsd = isBs ? calculateUsdFromBs(deuda.saldo_pendiente, rate) : deuda.saldo_pendiente;
  const saldoBs = isBs ? deuda.saldo_pendiente : calculateBsFromUsd(deuda.saldo_pendiente, rate);

  const totalUsd = isBs ? calculateUsdFromBs(deuda.monto_total, rate) : deuda.monto_total;
  const totalBs = isBs ? deuda.monto_total : calculateBsFromUsd(deuda.monto_total, rate);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(`/deudas/${deuda.id}` as any)}
      className="bg-white dark:bg-zinc-900 rounded-3xl p-5 mb-3.5"
    >
      {/* Encabezado: Concepto y Estado */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-1 mr-2 min-w-0">
          <AppText
            weight="bold"
            className="text-base text-zinc-900 dark:text-zinc-100"
            numberOfLines={1}
          >
            {deuda.concepto}
          </AppText>
          <AppText
            weight="medium"
            className="text-[11px] text-[#8a8a8e]"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatFriendlyDate(deuda.fecha_creacion)} • Tasa: Bs. {deuda.tasa_cambio}
          </AppText>
        </View>

        <View
          className={`px-3 py-1 rounded-full flex-row items-center gap-1 shrink-0 ${
            isPaid
              ? 'bg-emerald-100 dark:bg-emerald-950/60'
              : 'bg-[#ECE7FF] dark:bg-zinc-800'
          }`}
        >
          <Ionicons
            name={isPaid ? 'checkmark-circle-outline' : 'time-outline'}
            size={12}
            color={isPaid ? '#059669' : '#7859d9'}
          />
          <AppText
            weight="bold"
            className={`text-[11px] ${
              isPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#7859d9]'
            }`}
          >
            {isPaid ? 'PAGADA' : 'PENDIENTE'}
          </AppText>
        </View>
      </View>

      {/* Saldo Restante en Grande: USD y BS */}
      <View className="bg-[#F6F7FB] dark:bg-zinc-800/60 rounded-2xl p-3.5 mb-3.5 flex-row justify-between items-center">
        <View className="flex-1 mr-2 min-w-0">
          <AppText
            weight="bold"
            className="text-[10px] uppercase tracking-wider text-[#8a8a8e]"
          >
            Saldo Restante
          </AppText>
          <AppText
            weight="extrabold"
            className={`text-xl ${
              isPaid
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-[#1a1a1a] dark:text-zinc-100'
            }`}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatUsd(Math.max(0, saldoUsd))}
          </AppText>
          <AppText
            weight="semibold"
            className="text-xs text-[#8a8a8e]"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            ≈ {formatBs(Math.max(0, saldoBs))}
          </AppText>
        </View>

        <View className="flex-1 ml-2 items-end min-w-0">
          <AppText
            weight="semibold"
            className="text-[10px] text-[#aeaeaf] uppercase"
          >
            Total Pactado
          </AppText>
          <AppText
            weight="bold"
            className="text-sm text-zinc-800 dark:text-zinc-200"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatUsd(totalUsd)}
          </AppText>
          <AppText
            weight="medium"
            className="text-xs text-[#8a8a8e]"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatBs(totalBs)}
          </AppText>
        </View>
      </View>

      {/* Barra de Progreso de Pago */}
      <View>
        <View className="flex-row justify-between items-center mb-1.5">
          <AppText
            weight="medium"
            className="text-[11px] text-[#8a8a8e]"
          >
            Abonado: {formatUsd(isBs ? calculateUsdFromBs(deuda.total_pagado, rate) : deuda.total_pagado)}
          </AppText>
          <AppText
            weight="bold"
            className="text-[11px] text-[#7859d9]"
          >
            {progressPercent}%
          </AppText>
        </View>

        <View className="w-full h-2 bg-zinc-200/80 dark:bg-zinc-800 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${
              isPaid ? 'bg-emerald-500' : 'bg-[#7859d9]'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
