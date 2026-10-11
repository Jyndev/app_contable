import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDeudas, NewPagoInput, NewDeudaInput } from '@/hooks/useDeudas';
import { DeudaConSaldo, Pago } from '@/database/types';
import {
  formatBs,
  formatUsd,
  formatFriendlyDate,
  calculateBsFromUsd,
  calculateUsdFromBs,
} from '@/utils/currency';
import { PaymentModal } from '@/components/PaymentModal';
import { DebtForm } from '@/components/DebtForm';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { AppText } from '@/components/AppText';
import { Fonts } from '@/constants/Typography';
import { useColorScheme } from '@/components/useColorScheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';

export default function DeudaDetailScreen() {
  const insets = useSafeAreaInsets();
  const { bottomInset, isKeyboardVisible } = useKeyboardBottomInset(insets.bottom);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const { id, openPayment } = useLocalSearchParams<{ id: string; openPayment?: string }>();
  const deudaId = Number(id);

  const { getDeudaDetalle, insertPago, updatePago, updateDeuda } = useDeudas();

  const [deuda, setDeuda] = useState<DeudaConSaldo | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(openPayment === 'true');
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const [showEditDeudaModal, setShowEditDeudaModal] = useState(false);

  useEffect(() => {
    if (openPayment === 'true') {
      setShowPaymentModal(true);
    }
  }, [openPayment]);

  const loadData = useCallback(async () => {
    if (!deudaId) return;
    try {
      setLoading(true);
      const res = await getDeudaDetalle(deudaId);
      setDeuda(res.deuda);
      setPagos(res.pagos);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo cargar la deuda');
    } finally {
      setLoading(false);
    }
  }, [deudaId, getDeudaDetalle]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePayment = async (data: NewPagoInput) => {
    if (!deuda) return 0;
    const res = await insertPago(data);
    await loadData();
    return res;
  };

  const handleUpdatePayment = async (data: NewPagoInput) => {
    if (!deuda || !editingPago) return;
    await updatePago(editingPago.id, deuda.id, data);
    setEditingPago(null);
    await loadData();
  };

  const handleUpdateDeuda = async (data: NewDeudaInput) => {
    if (!deuda) return;
    await updateDeuda(deuda.id, data);
    setShowEditDeudaModal(false);
    await loadData();
  };

  if (loading) {
    return (
      <View className="flex-1 bg-[#F6F7FB] dark:bg-[#121214] justify-center items-center">
        <ActivityIndicator size="large" color="#7859d9" />
      </View>
    );
  }

  if (!deuda) {
    return (
      <View className="flex-1 bg-[#F6F7FB] dark:bg-[#121214] justify-center items-center p-6">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <AppText
          weight="bold"
          className="text-lg text-zinc-800 dark:text-zinc-200 mt-2"
        >
          Deuda no encontrada
        </AppText>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 bg-[#7859d9] px-4 py-2 rounded-xl"
        >
          <AppText
            weight="bold"
            className="text-white"
          >
            Volver
          </AppText>
        </TouchableOpacity>
      </View>
    );
  }

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

  const pagadoUsd = isBs ? calculateUsdFromBs(deuda.total_pagado, rate) : deuda.total_pagado;
  const pagadoBs = isBs ? deuda.total_pagado : calculateBsFromUsd(deuda.total_pagado, rate);

  return (
    <View className="flex-1 bg-[#F6F7FB] dark:bg-[#121214]">
      <BackgroundDecorations />
      <Stack.Screen
        options={{
          headerTitle: deuda.concepto,
          headerBackTitle: 'Deudas',
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
                onPress={() => setShowEditDeudaModal(true)}
                className="w-9 h-9 rounded-full items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80"
              >
                <Ionicons name="create-outline" size={18} color="#7859d9" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 110 }}>
        {/* Tarjeta de Saldo Restante Principal Dual Decorada */}
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
                  Saldo Restante
                </AppText>
                <AppText
                  weight="medium"
                  className="text-[10px] text-white/60"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Tasa registrada: Bs. {deuda.tasa_cambio}
                </AppText>
              </View>
              <View
                className={`px-3 py-1 rounded-full flex-row items-center gap-1.5 shrink-0 ${
                  isPaid ? 'bg-emerald-500/20' : 'bg-white/20'
                }`}
              >
                <View
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPaid ? 'bg-emerald-400' : 'bg-amber-300'
                  }`}
                />
                <AppText
                  weight="bold"
                  className="text-xs text-white"
                >
                  {isPaid ? 'PAGADA' : 'PENDIENTE'}
                </AppText>
              </View>
            </View>

            {/* Saldo en Grande en USD y Bolívares */}
            <View className="my-1 z-10">
              <AppText
                weight="extrabold"
                className="text-3xl text-white tracking-tight"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatUsd(Math.max(0, saldoUsd))}
              </AppText>
              <AppText
                weight="semibold"
                className="text-sm text-white/85 mt-0.5"
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                ≈ {formatBs(Math.max(0, saldoBs))}
              </AppText>
            </View>

            {/* Desglose: Total vs Pagado */}
            <View className="flex-row justify-between items-center pt-3 mt-2 border-t border-white/15 z-10">
              <View className="flex-1 mr-2 min-w-0">
                <AppText
                  weight="semibold"
                  className="text-[10px] text-white/70 uppercase tracking-wider"
                  numberOfLines={1}
                >
                  Monto Original
                </AppText>
                <AppText
                  weight="bold"
                  className="text-xs text-white mt-0.5"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatUsd(totalUsd)}
                </AppText>
                <AppText
                  weight="medium"
                  className="text-[10px] text-white/70"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatBs(totalBs)}
                </AppText>
              </View>

              <View className="flex-1 ml-2 items-end min-w-0">
                <AppText
                  weight="semibold"
                  className="text-[10px] text-white/70 uppercase tracking-wider"
                  numberOfLines={1}
                >
                  Total Abonado
                </AppText>
                <AppText
                  weight="bold"
                  className="text-xs text-emerald-300 mt-0.5"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatUsd(pagadoUsd)}
                </AppText>
                <AppText
                  weight="medium"
                  className="text-[10px] text-emerald-300/80"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {formatBs(pagadoBs)}
                </AppText>
              </View>
            </View>

            {/* Barra de Progreso */}
            <View className="mt-3 z-10">
              <View className="flex-row justify-between mb-1.5">
                <AppText
                  weight="medium"
                  className="text-xs text-white/80"
                >
                  Progreso de Liquidación
                </AppText>
                <AppText
                  weight="bold"
                  className="text-xs text-white"
                >
                  {progressPercent}%
                </AppText>
              </View>
              <View className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                <View
                  className="h-full rounded-full bg-white"
                  style={{ width: `${progressPercent}%` }}
                />
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Botón de Registrar Pago */}
        {!isPaid && (
          <TouchableOpacity
            onPress={() => setShowPaymentModal(true)}
            className="bg-[#7859d9] active:bg-[#6845cb] rounded-2xl py-4 items-center justify-center flex-row mb-6"
          >
            <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
            <AppText
              weight="bold"
              className="text-white text-base ml-2"
            >
              Registrar Nuevo Abono / Pago
            </AppText>
          </TouchableOpacity>
        )}

        {/* Historial de Pagos con desglose dual */}
        <View className="mb-4">
          <View className="flex-row justify-between items-center mb-3">
            <AppText
              weight="bold"
              className="text-base text-zinc-900 dark:text-zinc-100"
            >
              Historial de Abonos ({pagos.length})
            </AppText>
          </View>

          {pagos.length === 0 ? (
            <View className="bg-white dark:bg-zinc-900 rounded-3xl p-6 items-center">
              <Ionicons name="receipt-outline" size={32} color="#94a3b8" />
              <AppText
                weight="semibold"
                className="text-sm text-zinc-600 dark:text-zinc-400 mt-2"
              >
                No se han registrado pagos aún
              </AppText>
              <AppText
                weight="regular"
                className="text-xs text-[#8a8a8e] text-center mt-1"
              >
                Haz clic en "Registrar Nuevo Abono" para comenzar a abonar a esta deuda.
              </AppText>
            </View>
          ) : (
            pagos.map((pago, index) => {
              const pagoRate = pago.tasa_cambio > 0 ? pago.tasa_cambio : rate;
              const pUsd = pago.monto_usd > 0 ? pago.monto_usd : isBs ? calculateUsdFromBs(pago.monto_pago, pagoRate) : pago.monto_pago;
              const pBs = pago.monto_bs > 0 ? pago.monto_bs : isBs ? pago.monto_pago : calculateBsFromUsd(pago.monto_pago, pagoRate);

              return (
                <View
                  key={pago.id}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-3.5 mb-2.5 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1 mr-2.5 min-w-0">
                    <View className="w-9 h-9 rounded-xl bg-[#ECE7FF] dark:bg-zinc-800 items-center justify-center shrink-0 mr-2.5">
                      <Ionicons name="checkmark-outline" size={17} color="#7859d9" />
                    </View>
                    <View className="flex-1 min-w-0">
                      <AppText
                        weight="bold"
                        className="text-xs text-zinc-800 dark:text-zinc-200"
                        numberOfLines={1}
                      >
                        Abono #{pagos.length - index}
                      </AppText>
                      <AppText
                        weight="medium"
                        className="text-[11px] text-[#8a8a8e] mt-0.5"
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {formatFriendlyDate(pago.fecha_pago)} • Tasa: Bs. {pagoRate}
                      </AppText>
                    </View>
                  </View>

                  <View className="flex-row items-center shrink-0 gap-2">
                    <View className="items-end shrink-0">
                      <AppText
                        weight="extrabold"
                        className="text-sm text-emerald-600 dark:text-emerald-400"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        + {formatUsd(pUsd)}
                      </AppText>
                      <AppText
                        weight="semibold"
                        className="text-[11px] text-[#8a8a8e]"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {formatBs(pBs)}
                      </AppText>
                    </View>
                    <TouchableOpacity
                      onPress={() => setEditingPago(pago)}
                      className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 active:bg-[#ECE7FF] dark:active:bg-zinc-700"
                    >
                      <Ionicons name="create-outline" size={15} color="#7859d9" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Modal para Registrar Pago Dual Nuevo */}
        <PaymentModal
          visible={showPaymentModal}
          deudaId={deuda.id}
          monedaDeuda={deuda.moneda}
          tasaDeuda={deuda.tasa_cambio}
          saldoRestante={deuda.saldo_pendiente}
          onClose={() => setShowPaymentModal(false)}
          onSubmit={handleCreatePayment}
        />

        {/* Modal para Editar Pago Existente */}
        {editingPago && (
          <PaymentModal
            visible={!!editingPago}
            deudaId={deuda.id}
            monedaDeuda={deuda.moneda}
            tasaDeuda={deuda.tasa_cambio}
            saldoRestante={deuda.saldo_pendiente}
            pagoToEdit={editingPago}
            onClose={() => setEditingPago(null)}
            onSubmit={handleUpdatePayment}
          />
        )}

        {/* Modal para Editar Deuda */}
        {showEditDeudaModal && (
          <Modal
            visible={showEditDeudaModal}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={() => setShowEditDeudaModal(false)}
          >
            <View
              style={{
                flex: 1,
                justifyContent: 'flex-end',
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                paddingBottom: bottomInset,
              }}
            >
              <View
                style={{
                  maxHeight: isKeyboardVisible ? '68%' : '88%',
                }}
                className="bg-white dark:bg-zinc-900 rounded-t-[32px] p-5"
              >
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
                >
                  <DebtForm
                    initialDeuda={deuda}
                    onSubmit={handleUpdateDeuda}
                    onClose={() => setShowEditDeudaModal(false)}
                  />
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </ScrollView>
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

