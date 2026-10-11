import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AhorroConProgreso } from '@/database/types';
import {
  formatBs,
  formatUsd,
  formatFriendlyDate,
  calculateBsFromUsd,
  calculateUsdFromBs,
} from '@/utils/currency';
import { AppText } from '@/components/AppText';

interface SavingsCardProps {
  ahorro: AhorroConProgreso;
}

export function SavingsCard({ ahorro }: SavingsCardProps) {
  const isCompleted = ahorro.estado === 'COMPLETADO' || ahorro.porcentaje_progreso >= 100;
  const progressPercent = ahorro.porcentaje_progreso;

  const rate = ahorro.tasa_cambio > 0 ? ahorro.tasa_cambio : 1;
  const isBs = ahorro.moneda === 'BS';

  const ahorradoUsd = isBs ? calculateUsdFromBs(ahorro.total_ahorrado, rate) : ahorro.total_ahorrado;
  const ahorradoBs = isBs ? ahorro.total_ahorrado : calculateBsFromUsd(ahorro.total_ahorrado, rate);

  const objetivoUsd = isBs ? calculateUsdFromBs(ahorro.monto_objetivo, rate) : ahorro.monto_objetivo;
  const objetivoBs = isBs ? ahorro.monto_objetivo : calculateBsFromUsd(ahorro.monto_objetivo, rate);

  const restanteUsd = isBs ? calculateUsdFromBs(ahorro.saldo_restante, rate) : ahorro.saldo_restante;
  const restanteBs = isBs ? ahorro.saldo_restante : calculateBsFromUsd(ahorro.saldo_restante, rate);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push(`/ahorros/${ahorro.id}` as any)}
      className="bg-white dark:bg-zinc-900 rounded-3xl p-5 mb-3.5 border border-zinc-100 dark:border-zinc-800/80 shadow-sm"
    >
      {/* Encabezado: Título, Categoría y Estado */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-1 mr-2 min-w-0">
          <View className="flex-row items-center gap-2 mb-0.5">
            <View className="w-6 h-6 rounded-full bg-[#ECE7FF] dark:bg-purple-950/70 items-center justify-center">
              <Ionicons name="sparkles" size={13} color="#7859d9" />
            </View>
            <AppText
              weight="bold"
              className="text-base text-zinc-900 dark:text-zinc-100 flex-1"
              numberOfLines={1}
            >
              {ahorro.titulo}
            </AppText>
          </View>
          <AppText
            weight="medium"
            className="text-[11px] text-[#8a8a8e]"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {formatFriendlyDate(ahorro.fecha_creacion)} • Tasa: Bs. {ahorro.tasa_cambio}
          </AppText>
        </View>

        <View
          className={`px-3 py-1 rounded-full flex-row items-center gap-1 shrink-0 ${
            isCompleted
              ? 'bg-emerald-100 dark:bg-emerald-950/60'
              : 'bg-[#ECE7FF] dark:bg-purple-950/50'
          }`}
        >
          <Ionicons
            name={isCompleted ? 'checkmark-circle-outline' : 'trending-up-outline'}
            size={12}
            color={isCompleted ? '#059669' : '#7859d9'}
          />
          <AppText
            weight="bold"
            className={`text-[11px] ${
              isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#7859d9] dark:text-purple-300'
            }`}
          >
            {isCompleted ? 'META LOGRADA' : `${progressPercent}% AHORRADO`}
          </AppText>
        </View>
      </View>

      {/* Montos Principales: Total Ahorrado vs Objetivo */}
      <View className="bg-[#F6F7FB] dark:bg-zinc-800/60 rounded-2xl p-3.5 mb-3.5 flex-row justify-between items-center">
        <View className="flex-1 mr-2 min-w-0">
          <AppText
            weight="bold"
            className="text-[10px] uppercase tracking-wider text-[#8a8a8e]"
          >
            Total Ahorrado
          </AppText>
          <AppText
            weight="extrabold"
            className="text-xl text-[#7859d9] dark:text-purple-300"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatUsd(ahorradoUsd)}
          </AppText>
          <AppText
            weight="semibold"
            className="text-xs text-[#8a8a8e]"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            ≈ {formatBs(ahorradoBs)}
          </AppText>
        </View>

        <View className="flex-1 ml-2 items-end min-w-0">
          <AppText
            weight="semibold"
            className="text-[10px] text-[#aeaeaf] uppercase"
          >
            Meta Objetivo
          </AppText>
          <AppText
            weight="bold"
            className="text-sm text-zinc-800 dark:text-zinc-200"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatUsd(objetivoUsd)}
          </AppText>
          <AppText
            weight="medium"
            className="text-xs text-[#8a8a8e]"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formatBs(objetivoBs)}
          </AppText>
        </View>
      </View>

      {/* Barra de Progreso con Porcentaje Ahorrado */}
      <View>
        <View className="flex-row justify-between items-center mb-1.5">
          <AppText
            weight="medium"
            className="text-[11px] text-[#8a8a8e]"
          >
            {isCompleted
              ? '¡Completaste tu objetivo!'
              : `Faltan ${formatUsd(restanteUsd)} (≈ ${formatBs(restanteBs)})`}
          </AppText>
          <View className="flex-row items-center gap-1">
            <Ionicons
              name={isCompleted ? "sparkles" : "pie-chart-outline"}
              size={12}
              color={isCompleted ? "#059669" : "#7859d9"}
            />
            <AppText
              weight="extrabold"
              className={`text-xs ${isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#7859d9] dark:text-purple-300'}`}
            >
              {progressPercent}%
            </AppText>
          </View>
        </View>

        <View className="w-full h-2.5 bg-zinc-200/80 dark:bg-zinc-800 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${
              isCompleted
                ? 'bg-emerald-500'
                : 'bg-gradient-to-r bg-[#7859d9]'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
