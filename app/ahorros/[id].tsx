import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAhorros, NewAporteInput, NewAhorroInput } from '@/hooks/useAhorros';
import { AhorroConProgreso, AporteAhorro } from '@/database/types';
import {
  formatBs,
  formatUsd,
  formatFriendlyDate,
  calculateBsFromUsd,
  calculateUsdFromBs,
} from '@/utils/currency';
import { SavingsContributionModal } from '@/components/SavingsContributionModal';
import { SavingsForm } from '@/components/SavingsForm';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { AppText } from '@/components/AppText';
import { Fonts } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';

export default function AhorroDetailScreen() {
  const insets = useSafeAreaInsets();
  const { bottomInset } = useKeyboardBottomInset(insets.bottom);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { id, openAporte } = useLocalSearchParams<{ id: string; openAporte?: string }>();
  const ahorroId = Number(id);

  const {
    getAhorroDetalle,
    insertAporte,
    updateAporte,
    deleteAporte,
    updateAhorro,
    deleteAhorro,
  } = useAhorros();

  const [ahorro, setAhorro] = useState<AhorroConProgreso | null>(null);
  const [aportes, setAportes] = useState<AporteAhorro[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAporteModal, setShowAporteModal] = useState(openAporte === 'true');
  const [editingAporte, setEditingAporte] = useState<AporteAhorro | null>(null);
  const [showEditAhorroModal, setShowEditAhorroModal] = useState(false);

  // Modales de Confirmación
  const [deleteGoalConfirmVisible, setDeleteGoalConfirmVisible] = useState(false);
  const [deleteAporteId, setDeleteAporteId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!ahorroId) return;
    try {
      setLoading(true);
      const res = await getAhorroDetalle(ahorroId);
      setAhorro(res.ahorro);
      setAportes(res.aportes);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo cargar el objetivo de ahorro');
    } finally {
      setLoading(false);
    }
  }, [ahorroId, getAhorroDetalle]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateAporte = async (data: NewAporteInput) => {
    if (!ahorro) return 0;
    const res = await insertAporte(data);
    await loadData();
    return res;
  };

  const handleUpdateAporte = async (data: NewAporteInput) => {
    if (!ahorro || !editingAporte) return;
    await updateAporte(editingAporte.id, ahorro.id, data);
    setEditingAporte(null);
    await loadData();
  };

  const handleUpdateAhorro = async (data: NewAhorroInput) => {
    if (!ahorro) return;
    await updateAhorro(ahorro.id, data);
    setShowEditAhorroModal(false);
    await loadData();
  };

  const handleDeleteGoal = async () => {
    if (!ahorro) return;
    try {
      await deleteAhorro(ahorro.id);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo eliminar el objetivo.');
    }
  };

  const handleDeleteAporteConfirm = async () => {
    if (!ahorro || !deleteAporteId) return;
    try {
      await deleteAporte(deleteAporteId, ahorro.id);
      setDeleteAporteId(null);
      await loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo eliminar el aporte.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F6F7FB] dark:bg-[#121214] justify-center items-center">
        <ActivityIndicator size="large" color="#7859d9" />
      </View>
    );
  }

  if (!ahorro) {
    return (
      <View className="flex-1 bg-[#F6F7FB] dark:bg-[#121214] justify-center items-center p-6">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <AppText weight="bold" className="text-lg text-zinc-800 dark:text-zinc-200 mt-2">
          Objetivo no encontrado
        </AppText>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-[#7859d9] px-4 py-2 rounded-xl"
        >
          <AppText weight="bold" className="text-white">
            Volver
          </AppText>
        </TouchableOpacity>
      </View>
    );
  }

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
    <View className="flex-1 bg-[#F6F7FB] dark:bg-[#121214]">
      <BackgroundDecorations />
      <Stack.Screen
        options={{
          headerTitle: ahorro.titulo,
          headerBackTitle: 'Ahorros',
          headerStyle: {
            backgroundColor: isDark ? '#121214' : '#F6F7FB',
          },
          headerTintColor: isDark ? '#F4F4F5' : '#1a1a1a',
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: Fonts.bold,
            color: isDark ? '#F4F4F5' : '#1a1a1a',
          },
          headerRight: () => (
            <View className="flex-row items-center gap-2">
              <ThemeToggleButton />
              <TouchableOpacity
                onPress={() => setShowEditAhorroModal(true)}
                className="w-9 h-9 rounded-full items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80"
              >
                <Ionicons name="create-outline" size={18} color="#7859d9" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 }}>
        {/* Banner Hero Principal con Porcentaje Ahorrado */}
        <View style={styles.cardShadow} className="mb-5">
          <LinearGradient
            colors={['#8b6dfc', '#7451ec', '#562ecc']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientContainer}
          >
            {/* Ondas decorativas de fondo */}
            <View style={styles.waveOverlay1} />
            <View style={styles.waveOverlay2} />

            <View className="flex-row justify-between items-center z-10 mb-2">
              <View className="flex-1 mr-2 min-w-0">
                <AppText
                  weight="bold"
                  className="text-xs uppercase tracking-widest text-white/80"
                  numberOfLines={1}
                >
                  Progreso del Objetivo
                </AppText>
                <AppText
                  weight="medium"
                  className="text-[10px] text-white/60"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Tasa: Bs. {ahorro.tasa_cambio} • Creado: {formatFriendlyDate(ahorro.fecha_creacion)}
                </AppText>
              </View>

              {/* Badge Porcentaje Destacado */}
              <View
                className={`px-3 py-1 rounded-full flex-row items-center gap-1.5 shrink-0 ${
                  isCompleted ? 'bg-emerald-500/30' : 'bg-white/20'
                }`}
              >
                <Ionicons
                  name={isCompleted ? 'sparkles' : 'pie-chart'}
                  size={12}
                  color={isCompleted ? '#a7f3d0' : '#ffffff'}
                />
                <AppText weight="extrabold" className="text-xs text-white">
                  {progressPercent}% Ahorrado
                </AppText>
              </View>
            </View>

            {/* Total Ahorrado en Grande */}
            <View className="my-1 z-10">
              <AppText
                weight="medium"
                className="text-white/75 text-[11px] uppercase tracking-wider"
              >
                Total Ahorrado
              </AppText>
              <AppText
                weight="extrabold"
                className="text-3xl text-white tracking-tight mt-0.5"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatUsd(ahorradoUsd)}
              </AppText>
              <AppText
                weight="semibold"
                className="text-sm text-white/85 mt-0.5"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ≈ {formatBs(ahorradoBs)}
              </AppText>
            </View>

            {/* Barra de Progreso Visual */}
            <View className="z-10 mt-2 mb-2">
              <View className="w-full h-2.5 bg-black/25 rounded-full overflow-hidden">
                <View
                  className={`h-full rounded-full ${
                    isCompleted ? 'bg-emerald-400' : 'bg-white'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </View>
            </View>

            {/* Desglose: Meta vs Restante */}
            <View className="flex-row justify-between items-center pt-3 mt-1 border-t border-white/15 z-10">
              <View>
                <AppText weight="medium" className="text-[10px] text-white/70 uppercase">
                  Meta Objetivo
                </AppText>
                <AppText weight="bold" className="text-sm text-white">
                  {formatUsd(objetivoUsd)}
                </AppText>
                <AppText weight="medium" className="text-[10px] text-white/70">
                  ≈ {formatBs(objetivoBs)}
                </AppText>
              </View>

              <View className="items-end">
                <AppText weight="medium" className="text-[10px] text-white/70 uppercase">
                  {isCompleted ? 'Estado' : 'Faltan para la Meta'}
                </AppText>
                <AppText
                  weight="bold"
                  className={`text-sm ${isCompleted ? 'text-emerald-300' : 'text-white'}`}
                >
                  {isCompleted ? '¡Meta Lograda!' : formatUsd(restanteUsd)}
                </AppText>
                {!isCompleted && (
                  <AppText weight="medium" className="text-[10px] text-white/70">
                    ≈ {formatBs(restanteBs)}
                  </AppText>
                )}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Acciones Rápidas */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={() => {
              setEditingAporte(null);
              setShowAporteModal(true);
            }}
            activeOpacity={0.85}
            className="flex-1 bg-[#7859d9] py-3.5 px-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm"
          >
            <Ionicons name="add-circle" size={18} color="#ffffff" />
            <AppText weight="bold" className="text-white text-xs">
              Agregar Aporte
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setDeleteGoalConfirmVisible(true)}
            activeOpacity={0.85}
            className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 py-3.5 px-4 rounded-2xl flex-row items-center justify-center gap-1.5"
          >
            <Ionicons name="trash-outline" size={16} color="#ef4444" />
            <AppText weight="bold" className="text-red-600 dark:text-red-400 text-xs">
              Eliminar
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Historial de Aportes */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <AppText weight="bold" className="text-base text-zinc-900 dark:text-zinc-100">
              Historial de Aportes ({aportes.length})
            </AppText>
          </View>

          {aportes.length === 0 ? (
            <View className="bg-white dark:bg-zinc-900 rounded-3xl p-6 items-center justify-center border border-zinc-100 dark:border-zinc-800/80">
              <View className="w-12 h-12 rounded-full bg-[#ECE7FF] dark:bg-purple-950/70 items-center justify-center mb-2">
                <Ionicons name="sparkles-outline" size={24} color="#7859d9" />
              </View>
              <AppText weight="bold" className="text-sm text-zinc-800 dark:text-zinc-200 text-center">
                Aún no has registrado aportes
              </AppText>
              <AppText weight="medium" className="text-xs text-[#8a8a8e] text-center mt-1">
                Comienza a sumar ahorros tocando "Agregar Aporte".
              </AppText>
            </View>
          ) : (
            <View className="space-y-3">
              {aportes.map((aporte, index) => {
                const aporteRate = aporte.tasa_cambio > 0 ? aporte.tasa_cambio : rate;
                const aporteIsUsd = aporte.monto_usd > 0 && aporte.monto_aporte === aporte.monto_usd;
                const usdAmt = aporteIsUsd
                  ? aporte.monto_usd
                  : calculateUsdFromBs(aporte.monto_aporte, aporteRate);
                const bsAmt = aporteIsUsd
                  ? calculateBsFromUsd(aporte.monto_usd, aporteRate)
                  : aporte.monto_aporte;

                return (
                  <View
                    key={aporte.id}
                    className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-2.5 border border-zinc-100 dark:border-zinc-800/80 shadow-sm flex-row justify-between items-center"
                  >
                    <View className="flex-row items-center gap-3 flex-1 mr-2 min-w-0">
                      <View className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/50 items-center justify-center shrink-0">
                        <Ionicons name="sparkles" size={18} color="#7859d9" />
                      </View>
                      <View className="flex-1 min-w-0">
                        <AppText weight="bold" className="text-sm text-zinc-900 dark:text-zinc-100" numberOfLines={1}>
                          {aporte.nota || `Aporte #${aportes.length - index}`}
                        </AppText>
                        <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                          {formatFriendlyDate(aporte.fecha_aporte)} • Tasa: Bs. {aporte.tasa_cambio}
                        </AppText>
                      </View>
                    </View>

                    <View className="items-end mr-3">
                      <AppText weight="extrabold" className="text-sm text-[#7859d9] dark:text-purple-300">
                        +{formatUsd(usdAmt)}
                      </AppText>
                      <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                        +{formatBs(bsAmt)}
                      </AppText>
                    </View>

                    {/* Botones de acción del aporte */}
                    <View className="flex-row items-center gap-1 shrink-0">
                      <TouchableOpacity
                        onPress={() => {
                          setEditingAporte(aporte);
                          setShowAporteModal(true);
                        }}
                        className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                      >
                        <Ionicons name="pencil" size={14} color="#7859d9" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => setDeleteAporteId(aporte.id)}
                        className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/50 items-center justify-center"
                      >
                        <Ionicons name="trash" size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal para Agregar/Editar Aporte */}
      <SavingsContributionModal
        visible={showAporteModal}
        ahorroId={ahorro.id}
        monedaAhorro={ahorro.moneda}
        tasaAhorro={ahorro.tasa_cambio}
        saldoRestante={ahorro.saldo_restante}
        montoObjetivo={ahorro.monto_objetivo}
        totalAhorradoActual={ahorro.total_ahorrado}
        aporteToEdit={editingAporte}
        onClose={() => {
          setShowAporteModal(false);
          setEditingAporte(null);
        }}
        onSubmit={editingAporte ? handleUpdateAporte : handleCreateAporte}
      />

      {/* Modal para Editar el Objetivo */}
      <Modal
        visible={showEditAhorroModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowEditAhorroModal(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            paddingBottom: bottomInset,
          }}
        >
          <View className="bg-[#F6F7FB] dark:bg-[#121214] rounded-t-[32px] p-6 max-h-[85%]">
            <SavingsForm
              initialAhorro={ahorro}
              onSubmit={handleUpdateAhorro}
              onClose={() => setShowEditAhorroModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Confirmación Eliminar Objetivo */}
      <ConfirmModal
        visible={deleteGoalConfirmVisible}
        title="¿Eliminar Objetivo?"
        message={`¿Estás seguro de que deseas eliminar "${ahorro.titulo}"? Esta acción borrará permanentemente la meta y todos sus aportes registrados.`}
        variant="danger"
        icon="trash"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteGoal}
        onCancel={() => setDeleteGoalConfirmVisible(false)}
      />

      {/* Confirmación Eliminar Aporte */}
      <ConfirmModal
        visible={deleteAporteId !== null}
        title="¿Eliminar Aporte?"
        message="¿Deseas eliminar este aporte? Se restará del total ahorrado y se recalculará el porcentaje de la meta."
        variant="danger"
        icon="trash"
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={handleDeleteAporteConfirm}
        onCancel={() => setDeleteAporteId(null)}
      />
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
    minHeight: 200,
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
