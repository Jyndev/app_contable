import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAhorros } from '@/hooks/useAhorros';
import { SavingsForm } from '@/components/SavingsForm';
import { SavingsCard } from '@/components/SavingsCard';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { formatUsd, formatBs } from '@/utils/currency';
import { AppText } from '@/components/AppText';

type FilterTab = 'EN_PROGRESO' | 'COMPLETADAS' | 'TODAS';

export default function AhorrosScreen() {
  const {
    ahorros,
    loading,
    fetchAhorros,
    insertAhorro,
    totalAhorradoUsd,
    totalAhorradoBs,
    totalObjetivoUsd,
    totalObjetivoBs,
    porcentajeGlobal,
  } = useAhorros();
  const [showForm, setShowForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('EN_PROGRESO');

  const filteredAhorros = useMemo(() => {
    if (activeFilter === 'EN_PROGRESO') {
      return ahorros.filter((a) => a.estado === 'EN_PROGRESO' && a.porcentaje_progreso < 100);
    }
    if (activeFilter === 'COMPLETADAS') {
      return ahorros.filter((a) => a.estado === 'COMPLETADO' || a.porcentaje_progreso >= 100);
    }
    return ahorros;
  }, [ahorros, activeFilter]);

  const activasCount = ahorros.filter(
    (a) => a.estado === 'EN_PROGRESO' && a.porcentaje_progreso < 100
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-[#F6F7FB] dark:bg-[#121214]" edges={['top']}>
      <BackgroundDecorations />
      <FlatList
        data={filteredAhorros}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchAhorros}
            tintColor="#7859d9"
            colors={['#7859d9']}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Header Bar Compacto con Modo Oscuro a la derecha */}
            <View className="flex-row items-center justify-between pt-2 pb-2 mb-2">
              <View className="w-9" />
              <AppText
                weight="extrabold"
                className="text-lg text-[#1a1a1a] dark:text-zinc-100 tracking-tight"
              >
                Objetivos de Ahorro
              </AppText>
              <ThemeToggleButton />
            </View>

            {/* Banner Principal de Ahorros con Gradiente Violeta / Púrpura */}
            <View style={styles.cardShadow} className="mb-4">
              <LinearGradient
                colors={['#8b6dfc', '#7451ec', '#562ecc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientContainer}
              >
                {/* Ondas decorativas de fondo */}
                <View style={styles.waveOverlay1} />
                <View style={styles.waveOverlay2} />

                {/* Fila Superior: Título y Metas Activas */}
                <View className="flex-row items-center justify-between z-10 mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                      <Ionicons name="sparkles" size={17} color="#ffffff" />
                    </View>
                    <AppText
                      weight="extrabold"
                      className="text-white text-xs uppercase tracking-wider"
                    >
                      Metas de Ahorro
                    </AppText>
                  </View>

                  <View className="flex-row items-center bg-white/20 px-2.5 py-1 rounded-full">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-300 mr-1.5" />
                    <AppText
                      weight="semibold"
                      className="text-white text-[11px]"
                    >
                      {activasCount} {activasCount === 1 ? 'meta activa' : 'metas activas'}
                    </AppText>
                  </View>
                </View>

                {/* Montos en Grande: Total Acumulado */}
                <View className="my-1 z-10">
                  <AppText
                    weight="medium"
                    className="text-white/75 text-[11px] uppercase tracking-wider"
                  >
                    Total Ahorrado Acumulado
                  </AppText>
                  <AppText
                    weight="extrabold"
                    className="text-white text-3xl tracking-tight mt-0.5"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatUsd(totalAhorradoUsd)}
                  </AppText>
                  <AppText
                    weight="semibold"
                    className="text-white/85 text-sm mt-0.5"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    ≈ {formatBs(totalAhorradoBs)}
                  </AppText>
                </View>

                {/* Barra de Progreso Global y Detalle */}
                <View className="z-10 pt-2.5 mt-1 border-t border-white/15">
                  <View className="flex-row justify-between items-center mb-1.5">
                    <AppText weight="medium" className="text-white/80 text-[11px]">
                      Meta Total: {formatUsd(totalObjetivoUsd)}
                    </AppText>
                    <View className="bg-white/20 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                      <Ionicons name="pie-chart" size={10} color="#ffffff" />
                      <AppText weight="extrabold" className="text-white text-[11px]">
                        {porcentajeGlobal}% Ahorrado
                      </AppText>
                    </View>
                  </View>
                  <View className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                    <View
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${porcentajeGlobal}%` }}
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Selector de Filtros y Botón Nueva Meta */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row bg-[#ECE7FF] dark:bg-zinc-800 p-1 rounded-2xl">
                {(['EN_PROGRESO', 'COMPLETADAS', 'TODAS'] as FilterTab[]).map((tab) => {
                  const isSelected = activeFilter === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      onPress={() => setActiveFilter(tab)}
                      className={`px-3 py-1.5 rounded-xl ${
                        isSelected ? 'bg-white dark:bg-zinc-700' : ''
                      }`}
                    >
                      <AppText
                        weight={isSelected ? 'bold' : 'medium'}
                        className={`text-xs ${
                          isSelected
                            ? 'text-[#7859d9] dark:text-zinc-100'
                            : 'text-[#8a8a8e]'
                        }`}
                      >
                        {tab === 'EN_PROGRESO'
                          ? 'En Progreso'
                          : tab === 'COMPLETADAS'
                          ? 'Logradas'
                          : 'Todas'}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                onPress={() => setShowForm((prev) => !prev)}
                className={`flex-row items-center px-3 py-2 rounded-xl ${
                  showForm ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-[#7859d9]'
                }`}
              >
                <Ionicons
                  name={showForm ? 'chevron-up-outline' : 'add-outline'}
                  size={16}
                  color={showForm ? '#3f3f46' : '#ffffff'}
                />
                <AppText
                  weight="bold"
                  className={`text-xs ml-1 ${
                    showForm ? 'text-zinc-700 dark:text-zinc-300' : 'text-white'
                  }`}
                >
                  {showForm ? 'Cerrar' : 'Nueva Meta'}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Formulario de Nueva Meta de Ahorro */}
            {showForm && (
              <View className="mb-5">
                <SavingsForm
                  onSubmit={async (data) => {
                    const id = await insertAhorro(data);
                    setShowForm(false);
                    return id;
                  }}
                  onClose={() => setShowForm(false)}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <SavingsCard ahorro={item} />}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-12 px-6 bg-white dark:bg-zinc-900 rounded-3xl mt-2 border border-zinc-100 dark:border-zinc-800/80">
              <View className="w-16 h-16 rounded-full bg-[#ECE7FF] dark:bg-purple-950/70 items-center justify-center mb-3">
                <Ionicons name="sparkles-outline" size={30} color="#7859d9" />
              </View>
              <AppText
                weight="bold"
                className="text-base text-zinc-800 dark:text-zinc-200 text-center"
              >
                {activeFilter === 'EN_PROGRESO'
                  ? 'No tienes objetivos en progreso'
                  : 'No se encontraron metas de ahorro'}
              </AppText>
              <AppText
                weight="medium"
                className="text-xs text-[#8a8a8e] text-center mt-1 mb-4"
              >
                {activeFilter === 'EN_PROGRESO'
                  ? 'Crea una nueva meta para comenzar a ahorrar y ver tu avance porcentual.'
                  : 'Registra un objetivo de ahorro para llevar el control en USD y BS.'}
              </AppText>
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                className="bg-[#7859d9] px-4 py-2.5 rounded-xl flex-row items-center"
              >
                <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
                <AppText weight="bold" className="text-white text-xs ml-1.5">
                  Crear Objetivo
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7859d9" />
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
