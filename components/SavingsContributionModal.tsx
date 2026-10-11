import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExchangeRateStore } from '@/store/exchangeRateStore';
import {
  toCents,
  fromCents,
  calculateBsFromUsd,
  calculateUsdFromBs,
  formatBs,
  formatUsd,
} from '@/utils/currency';
import { Moneda, AporteAhorro } from '@/database/types';
import { NewAporteInput } from '@/hooks/useAhorros';
import { AppText } from '@/components/AppText';
import { ConfirmModal } from '@/components/ConfirmModal';
import { typography } from '@/constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';

interface SavingsContributionModalProps {
  visible: boolean;
  ahorroId: number;
  monedaAhorro: string;
  tasaAhorro: number;
  saldoRestante: number;
  montoObjetivo: number;
  totalAhorradoActual: number;
  aporteToEdit?: AporteAhorro | null;
  onClose: () => void;
  onSubmit: (data: NewAporteInput) => Promise<number | void>;
}

export function SavingsContributionModal({
  visible,
  ahorroId,
  monedaAhorro,
  tasaAhorro,
  saldoRestante,
  montoObjetivo,
  totalAhorradoActual,
  aporteToEdit,
  onClose,
  onSubmit,
}: SavingsContributionModalProps) {
  const insets = useSafeAreaInsets();
  const { bottomInset, isKeyboardVisible } = useKeyboardBottomInset(insets.bottom);
  const { rate } = useExchangeRateStore();
  const isEditing = !!aporteToEdit;
  const effectiveRate =
    aporteToEdit && aporteToEdit.tasa_cambio > 0
      ? aporteToEdit.tasa_cambio
      : rate > 0
      ? rate
      : tasaAhorro > 0
      ? tasaAhorro
      : 1;

  const [contributionMoneda, setContributionMoneda] = useState<Moneda>('USD');
  const [montoStr, setMontoStr] = useState('');
  const [nota, setNota] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Estados para alertas personalizadas
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalInfo, setErrorModalInfo] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (visible) {
      if (aporteToEdit) {
        const isAporteUsd = aporteToEdit.monto_usd > 0 && aporteToEdit.monto_aporte === aporteToEdit.monto_usd;
        const cur: Moneda = isAporteUsd ? 'USD' : 'BS';
        setContributionMoneda(cur);
        const amountCents = isAporteUsd
          ? aporteToEdit.monto_usd
          : aporteToEdit.monto_bs > 0
          ? aporteToEdit.monto_bs
          : aporteToEdit.monto_aporte;
        setMontoStr(fromCents(amountCents).toString());
        setNota(aporteToEdit.nota || '');
      } else {
        setContributionMoneda((monedaAhorro as Moneda) || 'USD');
        setMontoStr('');
        setNota('');
      }
    }
  }, [visible, aporteToEdit, monedaAhorro]);

  const inputCents = useMemo(() => {
    return toCents(montoStr);
  }, [montoStr]);

  const { montoBsCents, montoUsdCents, montoBaseCents } = useMemo(() => {
    if (inputCents <= 0) {
      return { montoBsCents: 0, montoUsdCents: 0, montoBaseCents: 0 };
    }

    if (contributionMoneda === 'USD') {
      const bs = calculateBsFromUsd(inputCents, effectiveRate);
      const base = monedaAhorro === 'USD' ? inputCents : bs;
      return { montoUsdCents: inputCents, montoBsCents: bs, montoBaseCents: base };
    } else {
      const usd = calculateUsdFromBs(inputCents, effectiveRate);
      const base = monedaAhorro === 'BS' ? inputCents : usd;
      return { montoBsCents: inputCents, montoUsdCents: usd, montoBaseCents: base };
    }
  }, [inputCents, contributionMoneda, effectiveRate, monedaAhorro]);

  // Cálculo del porcentaje proyectado
  const projectedTotalAhorrado = useMemo(() => {
    const prevAporte = isEditing && aporteToEdit ? aporteToEdit.monto_aporte : 0;
    return Math.max(0, totalAhorradoActual - prevAporte + montoBaseCents);
  }, [totalAhorradoActual, isEditing, aporteToEdit, montoBaseCents]);

  const projectedPercent = useMemo(() => {
    if (montoObjetivo <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((projectedTotalAhorrado / montoObjetivo) * 100)));
  }, [projectedTotalAhorrado, montoObjetivo]);

  const handleSave = async () => {
    if (inputCents <= 0) {
      setErrorModalInfo({
        visible: true,
        title: 'Monto Inválido',
        message: 'El monto del aporte de ahorro debe ser mayor a 0.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        ahorro_id: ahorroId,
        monto_aporte: montoBaseCents,
        monto_bs: montoBsCents,
        tasa_cambio: effectiveRate,
        monto_usd: montoUsdCents,
        fecha_aporte: aporteToEdit?.fecha_aporte || new Date().toISOString(),
        nota: nota.trim() || null,
      });
      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorModalInfo({
        visible: true,
        title: isEditing ? 'Error al Actualizar' : 'Error al Registrar',
        message: err?.message || 'No se pudo registrar el aporte.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessModalVisible(false);
    setMontoStr('');
    setNota('');
    onClose();
  };

  return (
    <>
      <Modal
        visible={visible && !successModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={onClose}
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
              maxHeight: isKeyboardVisible ? '70%' : '88%',
            }}
            className="bg-white dark:bg-zinc-900 rounded-t-[32px] p-6"
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }}
            >
              {/* Header */}
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-lg bg-[#ECE7FF] dark:bg-purple-950/70 items-center justify-center">
                    <Ionicons name={isEditing ? 'create-outline' : 'sparkles'} size={18} color="#7859d9" />
                  </View>
                  <AppText
                    weight="bold"
                    className="text-lg text-zinc-900 dark:text-zinc-100"
                  >
                    {isEditing ? 'Editar Aporte' : 'Agregar Aporte al Ahorro'}
                  </AppText>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                >
                  <Ionicons name="close" size={18} color="#8a8a8e" />
                </TouchableOpacity>
              </View>

              {/* Selector de Moneda */}
              <View className="mb-4">
                <AppText
                  weight="semibold"
                  className="text-xs text-[#8a8a8e] mb-2 uppercase tracking-wider"
                >
                  Moneda del Aporte
                </AppText>
                <View className="flex-row bg-[#F6F7FB] dark:bg-zinc-800 p-1 rounded-2xl">
                  <TouchableOpacity
                    onPress={() => setContributionMoneda('USD')}
                    className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
                      contributionMoneda === 'USD'
                        ? 'bg-[#7859d9]'
                        : 'bg-transparent'
                    }`}
                  >
                    <Ionicons
                      name="logo-usd"
                      size={14}
                      color={contributionMoneda === 'USD' ? '#ffffff' : '#8a8a8e'}
                    />
                    <AppText
                      weight="bold"
                      className={`text-xs ${
                        contributionMoneda === 'USD'
                          ? 'text-white'
                          : 'text-[#8a8a8e]'
                      }`}
                    >
                      Dólares (USD)
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setContributionMoneda('BS')}
                    className={`flex-1 py-2.5 rounded-xl items-center flex-row justify-center gap-1.5 ${
                      contributionMoneda === 'BS'
                        ? 'bg-[#7859d9]'
                        : 'bg-transparent'
                    }`}
                  >
                    <AppText
                      weight="bold"
                      className={`text-xs ${
                        contributionMoneda === 'BS'
                          ? 'text-white'
                          : 'text-[#8a8a8e]'
                      }`}
                    >
                      Bs. Bolívares
                    </AppText>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Input de Monto */}
              <View className="mb-4">
                <AppText
                  weight="semibold"
                  className="text-xs text-[#8a8a8e] mb-2 uppercase tracking-wider"
                >
                  Monto a Aportar
                </AppText>
                <View className="flex-row items-center bg-[#F6F7FB] dark:bg-zinc-800 rounded-2xl px-4 py-3">
                  <AppText
                    weight="bold"
                    className="text-lg text-[#7859d9] mr-2"
                  >
                    {contributionMoneda === 'USD' ? '$' : 'Bs.'}
                  </AppText>
                  <TextInput
                    value={montoStr}
                    onChangeText={setMontoStr}
                    placeholder="0.00"
                    placeholderTextColor="#aeaeaf"
                    keyboardType="decimal-pad"
                    autoFocus
                    style={[typography.bold, { flex: 1, fontSize: 18 }]}
                    className="text-zinc-900 dark:text-zinc-100 p-0"
                  />
                </View>
              </View>

              {/* Campo de Nota Opcional */}
              <View className="mb-4">
                <AppText
                  weight="semibold"
                  className="text-xs text-[#8a8a8e] mb-2 uppercase tracking-wider"
                >
                  Nota o Comentario (Opcional)
                </AppText>
                <View className="bg-[#F6F7FB] dark:bg-zinc-800 rounded-2xl px-4 py-3">
                  <TextInput
                    value={nota}
                    onChangeText={setNota}
                    placeholder="Ej. Bono de fin de mes, Venta de garaje..."
                    placeholderTextColor="#aeaeaf"
                    style={[typography.regular, { fontSize: 14 }]}
                    className="text-zinc-900 dark:text-zinc-100 p-0"
                  />
                </View>
              </View>

              {/* Preview de Conversión y Progreso Resultante */}
              <View className="bg-[#ECE7FF]/60 dark:bg-purple-950/30 rounded-2xl p-4 mb-5 border border-purple-100 dark:border-purple-900/30">
                <View className="flex-row justify-between items-center mb-2">
                  <AppText weight="medium" className="text-xs text-[#8a8a8e]">
                    Tasa aplicada: <AppText weight="bold" className="text-[#7859d9] dark:text-purple-300">Bs. {effectiveRate.toFixed(2)}</AppText>
                  </AppText>
                  <AppText weight="bold" className="text-xs text-[#7859d9] dark:text-purple-300">
                    ≈ {contributionMoneda === 'USD' ? formatBs(montoBsCents) : formatUsd(montoUsdCents)}
                  </AppText>
                </View>

                {/* Impacto en el % de ahorro */}
                {inputCents > 0 && (
                  <View className="pt-2 border-t border-purple-200/50 dark:border-purple-800/40 flex-row justify-between items-center">
                    <AppText weight="medium" className="text-xs text-zinc-700 dark:text-zinc-300">
                      Alcanzarás el porcentaje:
                    </AppText>
                    <View className="bg-[#7859d9] px-2.5 py-0.5 rounded-full">
                      <AppText weight="extrabold" className="text-white text-xs">
                        {projectedPercent}%
                      </AppText>
                    </View>
                  </View>
                )}
              </View>

              {/* Botón de Enviar */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={submitting}
                activeOpacity={0.85}
                className="w-full bg-[#7859d9] py-4 rounded-2xl items-center justify-center shadow-md shadow-purple-500/20"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <AppText
                    weight="bold"
                    className="text-white text-sm"
                  >
                    {isEditing ? 'Actualizar Aporte' : 'Confirmar Aporte'}
                  </AppText>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Éxito */}
      <ConfirmModal
        visible={successModalVisible}
        title={isEditing ? '¡Aporte Actualizado!' : '¡Aporte Registrado!'}
        message={
          isEditing
            ? 'El aporte de ahorro fue modificado con éxito.'
            : 'Tu aporte fue sumado a tu objetivo de ahorro con éxito.'
        }
        variant="success"
        icon="checkmark-circle"
        confirmText="Entendido"
        singleButton
        onConfirm={handleCloseSuccess}
        onCancel={handleCloseSuccess}
      />

      {/* Modal de Error */}
      <ConfirmModal
        visible={errorModalInfo.visible}
        title={errorModalInfo.title}
        message={errorModalInfo.message}
        variant="danger"
        icon="alert-circle"
        confirmText="Entendido"
        singleButton
        onConfirm={() => setErrorModalInfo((prev) => ({ ...prev, visible: false }))}
        onCancel={() => setErrorModalInfo((prev) => ({ ...prev, visible: false }))}
      />
    </>
  );
}
