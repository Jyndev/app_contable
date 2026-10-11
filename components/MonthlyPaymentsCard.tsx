import React, { useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  PanResponder,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatBs, formatUsd } from '@/utils/currency';
import { AppText } from '@/components/AppText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

const SPANISH_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function formatMonthYearSpanish(date: Date): string {
  const month = SPANISH_MONTHS[date.getMonth()];
  const year = date.getFullYear();
  return `${month} ${year}`;
}

interface MonthlyPaymentsCardProps {
  selectedDate: Date;
  totalPagosUsd: number;
  totalPagosBs: number;
  cantidadPagos: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onResetToCurrentMonth?: () => void;
  isCurrentMonth?: boolean;
}

export function MonthlyPaymentsCard({
  selectedDate,
  totalPagosUsd,
  totalPagosBs,
  cantidadPagos,
  onPrevMonth,
  onNextMonth,
  onResetToCurrentMonth,
  isCurrentMonth = true,
}: MonthlyPaymentsCardProps) {
  const panX = useRef(new Animated.Value(0)).current;

  // Manejo de gestos de deslizamiento (Swipe horizontal)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        panX.setValue(gestureState.dx * 0.4);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 45) {
          // Deslizar a la derecha -> Mes Anterior
          Animated.timing(panX, {
            toValue: 60,
            duration: 120,
            useNativeDriver: true,
          }).start(() => {
            onPrevMonth();
            panX.setValue(-60);
            Animated.spring(panX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start();
          });
        } else if (gestureState.dx < -45) {
          // Deslizar a la izquierda -> Mes Siguiente
          Animated.timing(panX, {
            toValue: -60,
            duration: 120,
            useNativeDriver: true,
          }).start(() => {
            onNextMonth();
            panX.setValue(60);
            Animated.spring(panX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 6,
            }).start();
          });
        } else {
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    })
  ).current;

  const monthLabel = formatMonthYearSpanish(selectedDate);
  const totalUsdFormatted = formatUsd(totalPagosUsd);
  const totalBsFormatted = formatBs(totalPagosBs);

  return (
    <View className="mb-4 items-center">
      <Animated.View
        style={[
          styles.cardShadow,
          { width: CARD_WIDTH, transform: [{ translateX: panX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['#8b6dfc', '#7451ec', '#562ecc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientContainer}
        >
          <View style={styles.waveOverlay1} />
          <View style={styles.waveOverlay2} />

          {/* Fila Superior: Badge "Total Pagos" y Controles de Navegación de Mes */}
          <View className="flex-row justify-between items-center z-10">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name="cash-outline" size={17} color="#ffffff" />
              </View>
              <AppText
                weight="extrabold"
                className="text-white text-xs uppercase tracking-wider"
              >
                Pagos del Mes
              </AppText>
            </View>

            <View className="flex-row items-center bg-white/20 px-2.5 py-1 rounded-full">
              <View
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  cantidadPagos > 0 ? 'bg-emerald-400' : 'bg-white/50'
                }`}
              />
              <AppText weight="semibold" className="text-white text-[11px]">
                {cantidadPagos === 1
                  ? '1 pago realizado'
                  : cantidadPagos > 1
                  ? `${cantidadPagos} pagos realizados`
                  : 'Sin pagos'}
              </AppText>
            </View>
          </View>

          {/* Sección Media: Montos totales de pagos en USD y BS */}
          <View className="my-2 z-10">
            <AppText
              weight="medium"
              className="text-white/75 text-[11px] uppercase tracking-wider"
            >
              Total Pagos Realizados
            </AppText>
            <AppText
              weight="extrabold"
              className="text-white text-4xl tracking-tight mt-0.5"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {totalUsdFormatted}
            </AppText>
            <AppText
              weight="semibold"
              className="text-white/85 text-sm mt-0.5"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ≈ {totalBsFormatted}
            </AppText>
          </View>

          {/* Fila Inferior: Navegación de Meses y Atajo */}
          <View className="z-10 pt-2.5 mt-1 border-t border-white/15 flex-row justify-between items-center">
            {/* Botón Mes Anterior */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onPrevMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="flex-row items-center bg-white/15 px-3 py-1.5 rounded-xl"
            >
              <Ionicons name="chevron-back" size={14} color="#ffffff" />
              <AppText weight="bold" className="text-white text-[11px] ml-1">
                Anterior
              </AppText>
            </TouchableOpacity>

            {/* Indicador Central / Reset a Mes Actual */}
            <TouchableOpacity
              activeOpacity={isCurrentMonth ? 1 : 0.7}
              onPress={isCurrentMonth ? undefined : onResetToCurrentMonth}
              className="items-center px-2"
            >
              <AppText weight="bold" className="text-white text-xs text-center">
                {monthLabel}
              </AppText>
              {!isCurrentMonth && onResetToCurrentMonth && (
                <AppText weight="medium" className="text-white/70 text-[9px] underline mt-0.5">
                  Ir al mes actual
                </AppText>
              )}
            </TouchableOpacity>

            {/* Botón Mes Siguiente */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onNextMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="flex-row items-center bg-white/15 px-3 py-1.5 rounded-xl"
            >
              <AppText weight="bold" className="text-white text-[11px] mr-1">
                Siguiente
              </AppText>
              <Ionicons name="chevron-forward" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
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
