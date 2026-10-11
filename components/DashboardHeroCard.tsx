import React, { useState, useRef } from 'react';
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
import { DashboardStats } from '@/hooks/useDashboard';

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

export type HeroCardTab = 'gastos' | 'deudas' | 'pagos';

interface DashboardHeroCardProps {
  selectedDate: Date;
  stats: DashboardStats;
  activeTab?: HeroCardTab;
  onTabChange?: (tab: HeroCardTab) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onResetToCurrentMonth?: () => void;
  isCurrentMonth?: boolean;
}

export function DashboardHeroCard({
  selectedDate,
  stats,
  activeTab = 'gastos',
  onTabChange,
  onPrevMonth,
  onNextMonth,
  onResetToCurrentMonth,
  isCurrentMonth = true,
}: DashboardHeroCardProps) {
  const [currentTab, setCurrentTab] = useState<HeroCardTab>(activeTab);
  const panX = useRef(new Animated.Value(0)).current;

  const handleTabSelect = (tab: HeroCardTab) => {
    setCurrentTab(tab);
    if (onTabChange) onTabChange(tab);
  };

  // Manejo de gestos de deslizamiento (Swipe horizontal)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
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

  // Valores según pestaña
  let mainTitle = 'Total Gastos del Mes';
  let badgeTitle = 'Gastos del Mes';
  let badgeCount = `${stats.cantidadGastosMes} ${stats.cantidadGastosMes === 1 ? 'gasto' : 'gastos'}`;
  let mainAmountUsd = formatUsd(stats.totalGastosMesUsd);
  let mainAmountBs = formatBs(stats.totalGastosMesBs);
  let iconName: any = 'receipt-outline';
  let hasItems = stats.cantidadGastosMes > 0;

  if (currentTab === 'deudas') {
    mainTitle = 'Saldo Total de Deudas';
    badgeTitle = 'Deudas Activas';
    badgeCount = `${stats.cantidadDeudasPendientes} ${stats.cantidadDeudasPendientes === 1 ? 'deuda' : 'deudas'}`;
    mainAmountUsd = formatUsd(stats.totalDeudasPendientesUsd);
    mainAmountBs = formatBs(stats.totalDeudasPendientesBs);
    iconName = 'card-outline';
    hasItems = stats.cantidadDeudasPendientes > 0;
  } else if (currentTab === 'pagos') {
    mainTitle = 'Total Pagos Realizados';
    badgeTitle = 'Abonos a Deudas';
    badgeCount = `${stats.monthlyPayments.cantidadPagos} ${stats.monthlyPayments.cantidadPagos === 1 ? 'abono' : 'abonos'}`;
    mainAmountUsd = formatUsd(stats.monthlyPayments.totalPagosUsd);
    mainAmountBs = formatBs(stats.monthlyPayments.totalPagosBs);
    iconName = 'cash-outline';
    hasItems = stats.monthlyPayments.cantidadPagos > 0;
  }

  return (
    <View className="mb-4 items-center">
      {/* Selector de Pestañas tipo Pill */}
      <View className="flex-row bg-[#ECE7FF] dark:bg-zinc-800/90 p-1 rounded-2xl mb-3 w-full max-w-[340px] self-center">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleTabSelect('gastos')}
          className={`flex-1 py-1.5 rounded-xl items-center justify-center ${
            currentTab === 'gastos' ? 'bg-[#7859d9] shadow-sm' : 'bg-transparent'
          }`}
        >
          <AppText
            weight="bold"
            className={`text-xs ${
              currentTab === 'gastos' ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Gastos
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleTabSelect('deudas')}
          className={`flex-1 py-1.5 rounded-xl items-center justify-center ${
            currentTab === 'deudas' ? 'bg-[#7859d9] shadow-sm' : 'bg-transparent'
          }`}
        >
          <AppText
            weight="bold"
            className={`text-xs ${
              currentTab === 'deudas' ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Deudas
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleTabSelect('pagos')}
          className={`flex-1 py-1.5 rounded-xl items-center justify-center ${
            currentTab === 'pagos' ? 'bg-[#7859d9] shadow-sm' : 'bg-transparent'
          }`}
        >
          <AppText
            weight="bold"
            className={`text-xs ${
              currentTab === 'pagos' ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Abonos
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Tarjeta Principal con Gradiente Púrpura */}
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

          {/* Fila Superior: Badge y Estado */}
          <View className="flex-row justify-between items-center z-10">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                <Ionicons name={iconName} size={17} color="#ffffff" />
              </View>
              <AppText
                weight="extrabold"
                className="text-white text-xs uppercase tracking-wider"
              >
                {badgeTitle}
              </AppText>
            </View>

            <View className="flex-row items-center bg-white/20 px-2.5 py-1 rounded-full">
              <View
                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                  hasItems ? 'bg-emerald-400' : 'bg-white/50'
                }`}
              />
              <AppText weight="semibold" className="text-white text-[11px]">
                {badgeCount}
              </AppText>
            </View>
          </View>

          {/* Sección Media: Montos principales */}
          <View className="my-2 z-10">
            <AppText
              weight="medium"
              className="text-white/75 text-[11px] uppercase tracking-wider"
            >
              {mainTitle}
            </AppText>
            <AppText
              weight="extrabold"
              className="text-white text-4xl tracking-tight mt-0.5"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {mainAmountUsd}
            </AppText>
            <AppText
              weight="semibold"
              className="text-white/85 text-sm mt-0.5"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              ≈ {mainAmountBs}
            </AppText>

            {/* Barra de amortización si estamos en Deudas */}
            {currentTab === 'deudas' && stats.totalDeudasOriginalUsd > 0 && (
              <View className="mt-2">
                <View className="flex-row justify-between items-center mb-1">
                  <AppText weight="medium" className="text-white/70 text-[10px]">
                    {stats.porcentajePagadoDeuda}% Pagado
                  </AppText>
                  <AppText weight="medium" className="text-white/70 text-[10px]">
                    Original: {formatUsd(stats.totalDeudasOriginalUsd)}
                  </AppText>
                </View>
                <View className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <View
                    style={{ width: `${Math.max(4, Math.min(100, stats.porcentajePagadoDeuda))}%` }}
                    className="h-full bg-white rounded-full"
                  />
                </View>
              </View>
            )}
          </View>

          {/* Fila Inferior: Navegación de Meses */}
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
    minHeight: 205,
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
