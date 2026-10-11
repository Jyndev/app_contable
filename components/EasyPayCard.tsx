import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useExchangeRateStore } from '@/store/exchangeRateStore';
import { formatFriendlyDate } from '@/utils/currency';
import { AppText } from '@/components/AppText';

interface EasyPayCardProps {
  onPress?: () => void;
  accountHolder?: string;
  cardNumber?: string;
}

export function EasyPayCard({
  onPress,
  accountHolder = 'Alexandra Vaise',
  cardNumber = '2343 3333 **** 1099',
}: EasyPayCardProps) {
  const { rate, isManual, lastUpdated } = useExchangeRateStore();

  return (
    <View className="mb-4 items-center">
      {/* Tarjeta Física */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={onPress}
        style={styles.cardShadow}
        className="w-full"
      >
        <LinearGradient
          colors={['#8b6dfc', '#7451ec', '#562ecc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          {/* Ondas orgánicas de fondo */}
          <View style={styles.waveOverlay1} />
          <View style={styles.waveOverlay2} />

          {/* Fila Superior: VISA y Estado Online */}
          <View className="flex-row justify-between items-center z-10">
            <AppText
              weight="extrabold"
              className="text-white text-2xl tracking-tighter"
            >
              VISA
            </AppText>

            <View className="flex-row items-center bg-white/20 px-2.5 py-1 rounded-full">
              <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
              <AppText
                weight="semibold"
                className="text-white text-[11px]"
              >
                {isManual ? 'Manual' : 'Online'}
              </AppText>
            </View>
          </View>

          {/* Sección Media: Tasa y Cotización destacada */}
          <View className="my-3 z-10">
            <AppText
              weight="medium"
              className="text-white/75 text-[11px] uppercase tracking-wider"
            >
              TASA OFICIAL 1 USD
            </AppText>
            <AppText
              weight="bold"
              className="text-white text-2xl tracking-tight mt-0.5"
            >
              Bs. {rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </AppText>
          </View>

          {/* Fila Inferior: Número de Tarjeta y Titular */}
          <View className="z-10 pt-1">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <AppText
                  weight="semibold"
                  className="text-white text-sm tracking-widest mr-2"
                >
                  {cardNumber}
                </AppText>
                <Ionicons name="copy-outline" size={13} color="rgba(255,255,255,0.7)" />
              </View>
            </View>

            <View className="flex-row justify-between items-center mt-1">
              <AppText
                weight="medium"
                className="text-white/80 text-xs"
              >
                {accountHolder}
              </AppText>

              {lastUpdated && (
                <AppText
                  weight="regular"
                  className="text-white/60 text-[10px]"
                >
                  {formatFriendlyDate(lastUpdated).split(',')[0]}
                </AppText>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Indicadores de Carrusel (Dots) */}
      <View className="flex-row items-center justify-center gap-1.5 mt-3">
        <View className="w-4 h-1.5 rounded-full bg-[#7859d9]" />
        <View className="w-1.5 h-1.5 rounded-full bg-[#dcd4ff] dark:bg-zinc-700" />
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
    minHeight: 185,
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
