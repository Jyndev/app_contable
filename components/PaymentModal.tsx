import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
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
  formatAmountByCurrency,
} from '@/utils/currency';
import { Moneda, Pago } from '@/database/types';
import { NewPagoInput } from '@/hooks/useDeudas';
import { AppText } from '@/components/AppText';
import { ConfirmModal } from '@/components/ConfirmModal';
import { typography } from '@/constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';

interface PaymentModalProps {
  visible: boolean;
  deudaId: number;
  monedaDeuda: string;
  tasaDeuda: number;
  saldoRestante: number;
  pagoToEdit?: Pago | null;
  onClose: () => void;
  onSubmit: (data: NewPagoInput) => Promise<number | void>;
}

export function PaymentModal({
  visible,
  deudaId,
  monedaDeuda,
  tasaDeuda,
  saldoRestante,
  pagoToEdit,
  onClose,
  onSubmit,
}: PaymentModalProps) {
  const insets = useSafeAreaInsets();
  const { bottomInset, isKeyboardVisible } = useKeyboardBottomInset(insets.bottom);
  const { rate } = useExchangeRateStore();
  const isEditing = !!pagoToEdit;
  const effectiveRate =
    pagoToEdit && pagoToEdit.tasa_cambio > 0
      ? pagoToEdit.tasa_cambio
      : rate > 0
      ? rate
      : tasaDeuda > 0
      ? tasaDeuda
      : 1;

  const [paymentMoneda, setPaymentMoneda] = useState<Moneda>('BS');
  const [montoStr, setMontoStr] = useState('');
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
      if (pagoToEdit) {
        // Detectar moneda de pago original
        const isPagoUsd = pagoToEdit.monto_usd > 0 && pagoToEdit.monto_pago === pagoToEdit.monto_usd;
        const cur: Moneda = isPagoUsd ? 'USD' : 'BS';
        setPaymentMoneda(cur);
        const amountCents = isPagoUsd
          ? pagoToEdit.monto_usd
          : pagoToEdit.monto_bs > 0
          ? pagoToEdit.monto_bs
          : pagoToEdit.monto_pago;
        setMontoStr(fromCents(amountCents).toString());
      } else {
        setPaymentMoneda('BS');
        setMontoStr('');
      }
    }
  }, [visible, pagoToEdit]);

  const inputCents = useMemo(() => {
    return toCents(montoStr);
  }, [montoStr]);

  const { montoBsCents, montoUsdCents, montoBaseCents } = useMemo(() => {
    if (inputCents <= 0) {
      return { montoBsCents: 0, montoUsdCents: 0, montoBaseCents: 0 };
    }

    if (paymentMoneda === 'USD') {
      const bs = calculateBsFromUsd(inputCents, effectiveRate);
      const base = monedaDeuda === 'USD' ? inputCents : bs;
      return { montoUsdCents: inputCents, montoBsCents: bs, montoBaseCents: base };
    } else {
      const usd = calculateUsdFromBs(inputCents, effectiveRate);
      const base = monedaDeuda === 'BS' ? inputCents : usd;
      return { montoBsCents: inputCents, montoUsdCents: usd, montoBaseCents: base };
    }
  }, [inputCents, paymentMoneda, effectiveRate, monedaDeuda]);

  // Si editamos, el saldo disponible es el saldo actual + el pago que se está modificando
  const maxAllowableBalance = isEditing && pagoToEdit
    ? saldoRestante + pagoToEdit.monto_pago
    : saldoRestante;

  const isDeudaBs = monedaDeuda === 'BS';
  const saldoUsd = isDeudaBs
    ? calculateUsdFromBs(maxAllowableBalance, effectiveRate)
    : maxAllowableBalance;
  const saldoBs = isDeudaBs
    ? maxAllowableBalance
    : calculateBsFromUsd(maxAllowableBalance, effectiveRate);

  const handlePayFull = () => {
    const fullAmountCents = paymentMoneda === 'USD' ? saldoUsd : saldoBs;
    setMontoStr(fromCents(fullAmountCents).toString());
  };

  const handleSave = async () => {
    if (inputCents <= 0) {
      setErrorModalInfo({
        visible: true,
        title: 'Monto Inválido',
        message: 'El monto del abono debe ser mayor a 0.',
      });
      return;
    }

    if (montoBaseCents > maxAllowableBalance) {
      setErrorModalInfo({
        visible: true,
        title: 'Monto Excede el Saldo',
        message: `El abono ingresado supera el saldo pendiente (${formatUsd(saldoUsd)} / ${formatBs(saldoBs)}).`,
      });
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        deuda_id: deudaId,
        monto_pago: montoBaseCents,
        monto_bs: montoBsCents,
        tasa_cambio: effectiveRate,
        monto_usd: montoUsdCents,
        fecha_pago: pagoToEdit?.fecha_pago || new Date().toISOString(),
      });
      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorModalInfo({
        visible: true,
        title: isEditing ? 'Error al Actualizar' : 'Error al Registrar',
        message: err?.message || 'No se pudo guardar el abono.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessModalVisible(false);
    setMontoStr('');
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
              maxHeight: isKeyboardVisible ? '68%' : '88%',
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
                  <View className="w-8 h-8 rounded-lg bg-[#ECE7FF] items-center justify-center">
                    <Ionicons name={isEditing ? 'create-outline' : 'cash-outline'} size={18} color="#7859d9" />
                  </View>
                  <AppText
                    weight="bold"
                    className="text-lg text-zinc-900 dark:text-zinc-100"
                  >
                    {isEditing ? 'Editar Abono / Pago' : 'Registrar Abono / Pago'}
                  </AppText>
                </View>
                <TouchableOpacity onPress={onClose} className="p-1">
                  <Ionicons name="close-outline" size={22} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Saldo actual info */}
              <View className="bg-[#F6F7FB] dark:bg-zinc-800/80 rounded-2xl p-4 mb-4 border border-zinc-100 dark:border-zinc-800">
                <View className="flex-row justify-between items-center">
                  <AppText
                    weight="semibold"
                    className="text-xs text-[#8a8a8e]"
                  >
                    Saldo Pendiente:
                  </AppText>
                  <View className="items-end">
                    <AppText
                      weight="extrabold"
                      className="text-base text-zinc-900 dark:text-zinc-100"
                    >
                      {formatUsd(saldoUsd)}
                    </AppText>
                    <AppText
                      weight="semibold"
                      className="text-xs text-[#8a8a8e]"
                    >
                      ≈ {formatBs(saldoBs)}
                    </AppText>
                  </View>
                </View>
                <AppText
                  weight="medium"
                  className="text-[10px] text-[#aeaeaf] mt-1"
                >
                  Tasa aplicada: Bs. {effectiveRate}
                </AppText>
              </View>

              {/* Selector de moneda del pago */}
              <View className="flex-row gap-2 mb-3">
                {(['BS', 'USD'] as Moneda[]).map((cur) => {
                  const isSelected = paymentMoneda === cur;
                  return (
                    <TouchableOpacity
                      key={cur}
                      onPress={() => {
                        setPaymentMoneda(cur);
                        setMontoStr('');
                      }}
                      className={`flex-1 py-2.5 px-2 rounded-xl items-center justify-center ${
                        isSelected
                          ? 'bg-[#7859d9]'
                          : 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <AppText
                        weight={isSelected ? 'bold' : 'semibold'}
                        className={`text-xs text-center ${
                          isSelected ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        Abonar en {cur === 'BS' ? 'Bolívares (Bs.)' : 'Dólares ($)'}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>

            {/* Monto input */}
            <View className="flex-row justify-between items-center mb-2">
              <AppText
                weight="semibold"
                className="text-xs text-[#8a8a8e] uppercase tracking-wide"
              >
                Monto a Abonar ({paymentMoneda === 'USD' ? 'USD' : 'BS'})
              </AppText>
              <TouchableOpacity
                onPress={handlePayFull}
                className="bg-[#ECE7FF] dark:bg-zinc-800 px-2.5 py-1 rounded-lg"
              >
                <AppText
                  weight="bold"
                  className="text-xs text-[#7859d9]"
                >
                  Pagar Totalidad
                </AppText>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3.5 mb-3">
              <AppText
                weight="bold"
                className="text-lg text-zinc-500 dark:text-zinc-400 mr-2"
              >
                {paymentMoneda === 'USD' ? '$' : 'Bs.'}
              </AppText>
              <TextInput
                value={montoStr}
                onChangeText={setMontoStr}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                style={typography.bold}
                className="flex-1 text-2xl text-zinc-900 dark:text-zinc-100"
                autoFocus
              />
            </View>

            {/* Conversión del pago en tiempo real */}
            {inputCents > 0 && (
              <View className="bg-[#ECE7FF] dark:bg-zinc-800 p-3 rounded-xl mb-4 flex-row justify-between items-center">
                <AppText
                  weight="semibold"
                  className="text-xs text-[#7859d9]"
                >
                  Equivalente:
                </AppText>
                <AppText
                  weight="bold"
                  className="text-sm text-[#1a1a1a] dark:text-zinc-100"
                >
                  {paymentMoneda === 'USD' ? formatBs(montoBsCents) : formatUsd(montoUsdCents)}
                </AppText>
              </View>
            )}

            {/* Botones */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-3.5 bg-zinc-200 dark:bg-zinc-800 rounded-2xl items-center justify-center"
              >
                <AppText
                  weight="semibold"
                  className="text-sm text-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSave}
                disabled={submitting}
                className="flex-1 py-3.5 bg-[#7859d9] active:bg-[#6845cb] rounded-2xl items-center justify-center flex-row"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                    <AppText
                      weight="bold"
                      className="text-white text-sm ml-1.5"
                    >
                      {isEditing ? 'Guardar Cambios' : 'Confirmar Abono'}
                    </AppText>
                  </>
                )}
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Éxito Estilizado */}
      <ConfirmModal
        visible={successModalVisible}
        title={isEditing ? '¡Abono Actualizado!' : '¡Abono Registrado!'}
        message={`El pago de ${formatAmountByCurrency(
          paymentMoneda === 'USD' ? montoUsdCents : montoBsCents,
          paymentMoneda
        )} ha sido ${isEditing ? 'actualizado' : 'acreditado'} exitosamente.`}
        confirmText="Entendido"
        variant="success"
        singleButton
        icon="checkmark-circle-outline"
        onConfirm={handleCloseSuccess}
      />

      {/* Modal de Error/Validación Estilizado */}
      <ConfirmModal
        visible={errorModalInfo.visible}
        title={errorModalInfo.title}
        message={errorModalInfo.message}
        confirmText="Aceptar"
        variant="danger"
        singleButton
        icon="alert-circle-outline"
        onConfirm={() => setErrorModalInfo({ visible: false, title: '', message: '' })}
      />
    </>
  );
}
