import React, { useState, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { DeudaConSaldo } from '@/database/types';
import { formatBs, formatUsd, formatAmountByCurrency } from '@/utils/currency';
import { AppText } from '@/components/AppText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

interface DebtsCarouselCardProps {
  totalDeudasPendientesUsd: number;
  totalDeudasPendientesBs: number;
  totalDeudasOriginalUsd: number;
  porcentajePagadoDeuda: number;
  porcentajeRestanteDeuda: number;
  cantidadDeudasPendientes: number;
  deudasActivas: DeudaConSaldo[];
}

export function DebtsCarouselCard({
  totalDeudasPendientesUsd,
  totalDeudasPendientesBs,
  totalDeudasOriginalUsd,
  porcentajePagadoDeuda,
  porcentajeRestanteDeuda,
  cantidadDeudasPendientes,
  deudasActivas,
}: DebtsCarouselCardProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / CARD_WIDTH);
    if (index !== activeIndex && index >= 0) {
      setActiveIndex(index);
    }
  };

  const isSingleDebt = deudasActivas.length === 1;
  const isMultipleDebts = deudasActivas.length > 1;

  // Etiqueta superior izquierda de la tarjeta general
  const generalCardTitle = isMultipleDebts
    ? `+${cantidadDeudasPendientes} Deudas`
    : isSingleDebt
    ? deudasActivas[0]?.concepto || '1 Deuda'
    : 'Sin Deudas';

  // Si hay más de una deuda: 1 de resumen + N individuales. Si hay 0 o 1: solo 1 tarjeta.
  const totalCards = isMultipleDebts ? 1 + deudasActivas.length : 1;

  const handleGeneralCardPress = () => {
    if (isSingleDebt && deudasActivas[0]?.id) {
      router.push(`/deudas/${deudasActivas[0].id}` as any);
    } else {
      router.push('/(tabs)/deudas');
    }
  };

  return (
    <View className="mb-4 items-center">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEnabled={isMultipleDebts}
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={CARD_WIDTH}
        decelerationRate="fast"
        style={{ width: CARD_WIDTH }}
      >
        {/* 1. Tarjeta Principal (Resumen si son varias, o la deuda única si hay solo una) */}
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handleGeneralCardPress}
          style={[styles.cardShadow, { width: CARD_WIDTH }]}
        >
          <LinearGradient
            colors={['#8b6dfc', '#7451ec', '#562ecc']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientContainer}
          >
            <View style={styles.waveOverlay1} />
            <View style={styles.waveOverlay2} />

            {/* Fila Superior: "+X Deudas" o Nombre de la deuda / Badge */}
            <View className="flex-row justify-between items-center z-10">
              <AppText
                weight="extrabold"
                className="text-white text-xl tracking-tight flex-1 mr-2"
                numberOfLines={1}
              >
                {generalCardTitle}
              </AppText>

              <View className="flex-row items-center bg-white/20 px-2.5 py-1 rounded-full">
                <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                <AppText
                  weight="semibold"
                  className="text-white text-[11px]"
                >
                  {isMultipleDebts ? 'Resumen Global' : isSingleDebt ? `#1 • ${deudasActivas[0]?.moneda}` : 'Al Día'}
                </AppText>
              </View>
            </View>

            {/* Sección Media: Cantidad en dólares que se debe y equivalente en Bs */}
            <View className="my-2 z-10">
              <AppText
                weight="medium"
                className="text-white/75 text-[11px] uppercase tracking-wider"
              >
                Saldo Total Pendiente
              </AppText>
              <AppText
                weight="extrabold"
                className="text-white text-3xl tracking-tight mt-0.5"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatUsd(totalDeudasPendientesUsd)}
              </AppText>
              <AppText
                weight="semibold"
                className="text-white/80 text-xs mt-0.5"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ≈ {formatBs(totalDeudasPendientesBs)}
              </AppText>
              <AppText
                weight="regular"
                className="text-white/60 text-[11px] mt-1"
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {isSingleDebt
                  ? `Monto Original: ${formatAmountByCurrency(deudasActivas[0].monto_total, deudasActivas[0].moneda)}`
                  : `Original: ${formatUsd(totalDeudasOriginalUsd)}`}
              </AppText>
            </View>

            {/* Fila Inferior: Porcentaje de Pago */}
            <View className="z-10 pt-2 border-t border-white/15">
              <View className="flex-row justify-between items-center mb-1.5">
                <AppText
                  weight="semibold"
                  className="text-white text-xs"
                >
                  Progreso de Pago
                </AppText>
                <AppText
                  weight="bold"
                  className="text-white text-xs"
                >
                  {porcentajePagadoDeuda}% amortizado
                </AppText>
              </View>

              {/* Barra de Progreso */}
              <View className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <View
                  style={{ width: `${Math.max(4, Math.min(100, porcentajePagadoDeuda))}%` }}
                  className="h-full rounded-full bg-white"
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* 2. Tarjetas Individuales SOLO cuando hay más de una deuda activa */}
        {isMultipleDebts &&
          deudasActivas.map((deuda, idx) => {
            const individualPercent = deuda.monto_total > 0
              ? Math.min(100, Math.max(0, Math.round((deuda.total_pagado / deuda.monto_total) * 100)))
              : 0;

            return (
              <TouchableOpacity
                key={deuda.id}
                activeOpacity={0.92}
                onPress={() => router.push(`/deudas/${deuda.id}` as any)}
                style={[styles.cardShadow, { width: CARD_WIDTH }]}
              >
                <LinearGradient
                  colors={['#7859d9', '#633ecc', '#4c26b8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientContainer}
                >
                  <View style={styles.waveOverlay1} />
                  <View style={styles.waveOverlay2} />

                  {/* Fila Superior: Nombre de la deuda individual y badge */}
                  <View className="flex-row justify-between items-center z-10">
                    <AppText
                      weight="extrabold"
                      className="text-white text-lg tracking-tight flex-1 mr-2"
                      numberOfLines={1}
                    >
                      {deuda.concepto}
                    </AppText>

                    <View className="flex-row items-center bg-white/20 px-2.5 py-1 rounded-full shrink-0">
                      <AppText
                        weight="semibold"
                        className="text-white text-[11px]"
                      >
                        #{idx + 1} • {deuda.moneda}
                      </AppText>
                    </View>
                  </View>

                  {/* Sección Media: Monto adeudado de esta deuda */}
                  <View className="my-2 z-10">
                    <AppText
                      weight="medium"
                      className="text-white/75 text-[11px] uppercase tracking-wider"
                    >
                      Saldo Pendiente
                    </AppText>
                    <AppText
                      weight="extrabold"
                      className="text-white text-3xl tracking-tight mt-0.5"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {formatUsd(deuda.saldo_pendiente_usd)}
                    </AppText>
                    <AppText
                      weight="semibold"
                      className="text-white/80 text-xs mt-0.5"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      ≈ {formatBs(deuda.saldo_pendiente_bs)}
                    </AppText>
                    <AppText
                      weight="regular"
                      className="text-white/60 text-[11px] mt-1"
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      Monto Original: {formatAmountByCurrency(deuda.monto_total, deuda.moneda)}
                    </AppText>
                  </View>

                  {/* Fila Inferior: Porcentaje individual */}
                  <View className="z-10 pt-2 border-t border-white/15">
                    <View className="flex-row justify-between items-center mb-1.5">
                      <AppText
                        weight="semibold"
                        className="text-white text-xs"
                      >
                        Porcentaje de Pago
                      </AppText>
                      <AppText
                        weight="bold"
                        className="text-white text-xs"
                      >
                        {individualPercent}% pagado
                      </AppText>
                    </View>

                    <View className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <View
                        style={{ width: `${Math.max(4, Math.min(100, individualPercent))}%` }}
                        className="h-full rounded-full bg-white"
                      />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Indicadores de Paginación del Carrusel (Dots) SOLO cuando hay más de 1 tarjeta */}
      {totalCards > 1 && (
        <View className="flex-row items-center justify-center gap-1.5 mt-3">
          {Array.from({ length: totalCards }).map((_, i) => (
            <View
              key={i}
              className={`h-1.5 rounded-full ${
                i === activeIndex
                  ? 'w-4 bg-[#7859d9]'
                  : 'w-1.5 bg-[#dcd4ff] dark:bg-zinc-700'
              }`}
            />
          ))}
        </View>
      )}
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
    minHeight: 195,
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
