import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDeudas } from '@/hooks/useDeudas';
import { DebtForm } from '@/components/DebtForm';
import { DebtCard } from '@/components/DebtCard';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { formatUsd, formatBs } from '@/utils/currency';
import { AppText } from '@/components/AppText';

type FilterTab = 'PENDIENTES' | 'PAGADAS' | 'TODAS';

export default function DeudasScreen() {
  const {
    deudas,
    loading,
    fetchDeudas,
    insertDeuda,
    totalDeudasPendientesUsd,
    totalDeudasPendientesBs,
  } = useDeudas();
  const [showForm, setShowForm] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('PENDIENTES');

  const filteredDeudas = useMemo(() => {
    if (activeFilter === 'PENDIENTES') {
      return deudas.filter((d) => d.estado === 'PENDIENTE' && d.saldo_pendiente > 0);
    }
    if (activeFilter === 'PAGADAS') {
      return deudas.filter((d) => d.estado === 'PAGADA' || d.saldo_pendiente <= 0);
    }
    return deudas;
  }, [deudas, activeFilter]);

  const pendientesCount = deudas.filter(
    (d) => d.estado === 'PENDIENTE' && d.saldo_pendiente > 0
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-[#F6F7FB] dark:bg-[#121214]" edges={['top']}>
      <BackgroundDecorations />
      <FlatList
        data={filteredDeudas}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchDeudas}
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
                Control de Deudas
              </AppText>
              <ThemeToggleButton />
            </View>

            {/* Banner Principal con Decoración Dashboard (LinearGradient + Wave Overlays) */}
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

                {/* Fila Superior */}
                <View className="flex-row items-center justify-between z-10 mb-2">
                  <View className="flex-row items-center gap-2">
                    <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                      <Ionicons name="card-outline" size={17} color="#ffffff" />
                    </View>
                    <AppText
                      weight="extrabold"
                      className="text-white text-xs uppercase tracking-wider"
                    >
                      Compromisos Pendientes
                    </AppText>
                  </View>

                  <View className="flex-row items-center bg-white/20 px-2.5 py-1 rounded-full">
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                    <AppText
                      weight="semibold"
                      className="text-white text-[11px]"
                    >
                      {pendientesCount} {pendientesCount === 1 ? 'activa' : 'activas'}
                    </AppText>
                  </View>
                </View>

                {/* Montos en Grande */}
                <View className="my-1 z-10">
                  <AppText
                    weight="medium"
                    className="text-white/75 text-[11px] uppercase tracking-wider"
                  >
                    Saldo Total por Pagar
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
                    className="text-white/85 text-sm mt-0.5"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    ≈ {formatBs(totalDeudasPendientesBs)}
                  </AppText>
                </View>

                {/* Fila Inferior con detalle */}
                <View className="z-10 pt-2.5 mt-1 border-t border-white/15 flex-row justify-between items-center">
                  <AppText weight="medium" className="text-white/70 text-[11px] flex-1 mr-2" numberOfLines={1}>
                    Suma total de saldos a la tasa registrada
                  </AppText>
                  <View className="bg-white/10 px-2 py-0.5 rounded-md shrink-0">
                    <AppText weight="semibold" className="text-white/90 text-[10px]">
                      En Moneda Dual
                    </AppText>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* Selector de Filtros y Botón Nueva Deuda */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row bg-[#ECE7FF] dark:bg-zinc-800 p-1 rounded-2xl">
                {(['PENDIENTES', 'PAGADAS', 'TODAS'] as FilterTab[]).map((tab) => {
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
                        {tab === 'PENDIENTES'
                          ? 'Pendientes'
                          : tab === 'PAGADAS'
                          ? 'Saldadas'
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
                  {showForm ? 'Cerrar' : 'Nueva Deuda'}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Formulario de Nueva Deuda */}
            {showForm && (
              <View className="mb-5">
                <DebtForm
                  onSubmit={async (data) => {
                    const id = await insertDeuda(data);
                    setShowForm(false);
                    return id;
                  }}
                  onClose={() => setShowForm(false)}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <DebtCard deuda={item} />}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-12 px-6 bg-white dark:bg-zinc-900 rounded-3xl mt-2">
              <View className="w-16 h-16 rounded-full bg-[#ECE7FF] items-center justify-center mb-3">
                <Ionicons name="checkmark-done-circle-outline" size={30} color="#7859d9" />
              </View>
              <AppText
                weight="bold"
                className="text-base text-zinc-800 dark:text-zinc-200 text-center"
              >
                {activeFilter === 'PENDIENTES'
                  ? 'No tienes deudas pendientes'
                  : 'No se encontraron deudas'}
              </AppText>
              <AppText
                weight="medium"
                className="text-xs text-[#8a8a8e] text-center mt-1 mb-4"
              >
                {activeFilter === 'PENDIENTES'
                  ? '¡Excelente! Todos tus compromisos están al día.'
                  : 'Registra un nuevo compromiso para llevar su control en USD y BS.'}
              </AppText>
              <TouchableOpacity
                onPress={() => setShowForm(true)}
                className="bg-[#7859d9] px-4 py-2.5 rounded-xl flex-row items-center"
              >
                <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
                <AppText weight="bold" className="text-white text-xs ml-1.5">
                  Crear Deuda
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
