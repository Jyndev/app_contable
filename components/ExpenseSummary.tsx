import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { formatBs, formatUsd } from '@/utils/currency';
import { AppText } from '@/components/AppText';

interface ExpenseSummaryProps {
  totalMesBs: number;
  totalMesUsd: number;
  cantidadMes: number;
  totalGeneralBs: number;
  totalGeneralUsd: number;
  cantidadGeneral: number;
}

export function ExpenseSummary({
  totalMesBs,
  totalMesUsd,
  cantidadMes,
  totalGeneralBs,
  totalGeneralUsd,
  cantidadGeneral,
}: ExpenseSummaryProps) {
  return (
    <View className="mb-4">
      {/* 1. Card Principal con Decoración Dashboard (LinearGradient + Wave Overlays) */}
      <View style={styles.cardShadow} className="mb-3">
        <LinearGradient
          colors={['#8b6dfc', '#7451ec', '#562ecc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          {/* Ondas decorativas de fondo */}
          <View style={styles.waveOverlay1} />
          <View style={styles.waveOverlay2} />

          {/* Fila Superior */}
          <View className="flex-row items-center justify-between z-10 mb-2">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="calendar-outline" size={17} color="#ffffff" />
              </View>
              <AppText
                weight="extrabold"
                className="text-white text-xs uppercase tracking-wider"
              >
                Gastos del Mes
              </AppText>
            </View>

            <View className="flex-row items-center bg-white/20 px-2.5 py-1 rounded-full">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
              <AppText
                weight="semibold"
                className="text-white text-[11px]"
              >
                {cantidadMes} {cantidadMes === 1 ? 'gasto' : 'gastos'}
              </AppText>
            </View>
          </View>

          {/* Montos en Grande */}
          <View className="my-1 z-10">
            <AppText
              weight="medium"
              className="text-white/75 text-[11px] uppercase tracking-wider"
            >
              Total Gastado en el Mes
            </AppText>
            <AppText
              weight="extrabold"
              className="text-white text-3xl tracking-tight mt-0.5"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatUsd(totalMesUsd)}
            </AppText>
            <AppText
              weight="semibold"
              className="text-white/85 text-sm mt-0.5"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ≈ {formatBs(totalMesBs)}
            </AppText>
          </View>

          {/* Fila Inferior con detalle */}
          <View className="z-10 pt-2.5 mt-1 border-t border-white/15 flex-row justify-between items-center">
            <AppText weight="medium" className="text-white/70 text-[11px] flex-1 mr-2" numberOfLines={1}>
              Control y balance del período actual
            </AppText>
            <View className="bg-white/10 px-2 py-0.5 rounded-md shrink-0">
              <AppText weight="semibold" className="text-white/90 text-[10px]">
                Mes en Curso
              </AppText>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* 2. Card Secundaria: Histórico General (Todos los gastos) */}
      <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2 flex-1 mr-2">
            <View className="w-7 h-7 rounded-full bg-[#ECE7FF] dark:bg-zinc-800 items-center justify-center shrink-0">
              <Ionicons name="stats-chart-outline" size={15} color="#7859d9" />
            </View>
            <AppText
              weight="bold"
              className="text-zinc-700 dark:text-zinc-300 text-xs uppercase tracking-wider"
              numberOfLines={1}
            >
              Total General Histórico
            </AppText>
          </View>
          <View className="bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-full shrink-0">
            <AppText
              weight="semibold"
              className="text-[#7859d9] text-xs"
            >
              {cantidadGeneral} {cantidadGeneral === 1 ? 'gasto' : 'gastos'}
            </AppText>
          </View>
        </View>

        <View className="flex-row items-baseline justify-between mt-1">
          <View className="flex-1">
            <AppText
              weight="extrabold"
              className="text-xl text-[#1a1a1a] dark:text-zinc-100"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatUsd(totalGeneralUsd)}
            </AppText>
            <AppText
              weight="semibold"
              className="text-xs text-[#8a8a8e] mt-0.5"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ≈ {formatBs(totalGeneralBs)}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    borderRadius: 28,
  },
  gradientContainer: {
    borderRadius: 28,
    padding: 22,
    minHeight: 180,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  waveOverlay1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  waveOverlay2: {
    position: 'absolute',
    bottom: -70,
    left: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});
