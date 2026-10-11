import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExchangeRateStore } from '@/store/exchangeRateStore';
import {
  toCents,
  calculateBsFromUsd,
  calculateUsdFromBs,
  formatBs,
  formatUsd,
  formatAmountByCurrency,
} from '@/utils/currency';
import { Deuda, DeudaConSaldo, Moneda } from '@/database/types';
import { NewDeudaInput } from '@/hooks/useDeudas';
import { fromCents } from '@/utils/currency';
import { AppText } from '@/components/AppText';
import { ConfirmModal } from '@/components/ConfirmModal';
import { typography } from '@/constants/Typography';

interface DebtFormProps {
  initialDeuda?: Deuda | DeudaConSaldo | null;
  onSubmit: (data: NewDeudaInput) => Promise<number | void>;
  onClose?: () => void;
}

export function DebtForm({ initialDeuda, onSubmit, onClose }: DebtFormProps) {
  const { rate } = useExchangeRateStore();
  const isEditing = !!initialDeuda;
  const effectiveRate =
    initialDeuda && initialDeuda.tasa_cambio > 0 ? initialDeuda.tasa_cambio : rate > 0 ? rate : 1;

  const [concepto, setConcepto] = useState(initialDeuda?.concepto || '');
  const [montoStr, setMontoStr] = useState(
    initialDeuda
      ? fromCents(initialDeuda.moneda === 'BS' ? initialDeuda.monto_bs : initialDeuda.monto_usd).toString()
      : ''
  );
  const [moneda, setMoneda] = useState<Moneda>((initialDeuda?.moneda as Moneda) || 'BS');
  const [submitting, setSubmitting] = useState(false);

  // Estados de modal de confirmación y error estilizados
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalInfo, setErrorModalInfo] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Cálculos de conversión en tiempo real
  const inputCents = useMemo(() => {
    return toCents(montoStr);
  }, [montoStr]);

  const { montoBsCents, montoUsdCents } = useMemo(() => {
    if (!effectiveRate || effectiveRate <= 0 || inputCents <= 0) {
      return { montoBsCents: 0, montoUsdCents: 0 };
    }
    if (moneda === 'USD') {
      return {
        montoUsdCents: inputCents,
        montoBsCents: calculateBsFromUsd(inputCents, effectiveRate),
      };
    } else {
      return {
        montoBsCents: inputCents,
        montoUsdCents: calculateUsdFromBs(inputCents, effectiveRate),
      };
    }
  }, [inputCents, moneda, effectiveRate]);

  const handleSubmit = async () => {
    if (!rate || rate <= 0) {
      setErrorModalInfo({
        visible: true,
        title: 'Tasa requerida',
        message: 'Debes configurar la tasa de cambio del día antes de registrar una deuda.',
      });
      return;
    }

    if (!concepto.trim()) {
      setErrorModalInfo({
        visible: true,
        title: 'Concepto requerido',
        message: 'Por favor describe el concepto o acreedor de la deuda.',
      });
      return;
    }

    if (inputCents <= 0) {
      setErrorModalInfo({
        visible: true,
        title: 'Monto inválido',
        message: 'El monto de la deuda debe ser mayor a 0.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        concepto: concepto.trim(),
        monto_total: inputCents,
        moneda: moneda,
        monto_bs: montoBsCents,
        tasa_cambio: effectiveRate,
        monto_usd: montoUsdCents,
        fecha_creacion: initialDeuda?.fecha_creacion || new Date().toISOString(),
      });

      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorModalInfo({
        visible: true,
        title: isEditing ? 'Error al Actualizar' : 'Error al Registrar',
        message: err?.message || (isEditing ? 'No se pudo actualizar la deuda.' : 'No se pudo guardar la deuda.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessModalVisible(false);
    if (!isEditing) {
      setConcepto('');
      setMontoStr('');
    }
    if (onClose) onClose();
  };

  return (
    <View className="bg-white dark:bg-zinc-900 rounded-3xl p-5">
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-[#ECE7FF] items-center justify-center">
            <Ionicons name={isEditing ? 'create-outline' : 'card-outline'} size={18} color="#7859d9" />
          </View>
          <AppText
            weight="bold"
            className="text-lg text-zinc-900 dark:text-zinc-100"
          >
            {isEditing ? 'Editar Deuda / Compromiso' : 'Nueva Deuda / Compromiso'}
          </AppText>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close-outline" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Concepto */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide"
      >
        Concepto / Acreedor / Entidad
      </AppText>
      <TextInput
        value={concepto}
        onChangeText={setConcepto}
        placeholder="Ej. Tarjeta de Crédito, Préstamo Juan, Factura..."
        placeholderTextColor="#94a3b8"
        style={typography.semibold}
        className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl text-base text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 mb-4"
      />

      {/* Selector de Moneda */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide"
      >
        Moneda Principal del Monto
      </AppText>
      <View className="flex-row gap-3 mb-4">
        {(['BS', 'USD'] as Moneda[]).map((cur) => {
          const isSelected = moneda === cur;
          return (
            <TouchableOpacity
              key={cur}
              onPress={() => setMoneda(cur)}
              className={`flex-1 py-3 rounded-2xl items-center border ${
                isSelected
                  ? 'bg-[#7859d9] border-[#7859d9]'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <AppText
                weight={isSelected ? 'bold' : 'semibold'}
                className={`text-sm ${
                  isSelected ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {cur === 'BS' ? 'Bs. Bolívares (BS)' : '$ Dólares (USD)'}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Monto de la Deuda */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide"
      >
        Monto Total {moneda === 'USD' ? 'en USD' : 'en Bolívares'}
      </AppText>
      <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 border border-zinc-200 dark:border-zinc-700 mb-4">
        <AppText
          weight="bold"
          className="text-lg text-zinc-500 dark:text-zinc-400 mr-2"
        >
          {moneda === 'USD' ? '$' : 'Bs.'}
        </AppText>
        <TextInput
          value={montoStr}
          onChangeText={setMontoStr}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#94a3b8"
          style={typography.bold}
          className="flex-1 text-xl text-zinc-900 dark:text-zinc-100"
        />
      </View>

      {/* Tarjeta de Conversión Dual en Tiempo Real */}
      <View className="bg-[#ECE7FF] dark:bg-zinc-800 border border-[#7859d9]/20 rounded-2xl p-4 mb-5">
        <View className="flex-row justify-between items-center mb-1">
          <AppText
            weight="semibold"
            className="text-xs text-[#7859d9]"
          >
            {moneda === 'USD' ? 'Equivalente en Bolívares (BS):' : 'Equivalente en Dólares (USD):'}
          </AppText>
          <AppText
            weight="medium"
            className="text-[11px] text-[#7859d9]"
          >
            Tasa: Bs. {rate > 0 ? rate : 1}
          </AppText>
        </View>
        <AppText
          weight="extrabold"
          className="text-2xl text-[#1a1a1a] dark:text-zinc-100"
        >
          {moneda === 'USD' ? formatBs(montoBsCents) : formatUsd(montoUsdCents)}
        </AppText>
      </View>

      {/* Botón de Enviar */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting || !rate || rate <= 0}
        className={`py-3.5 rounded-2xl items-center justify-center flex-row ${
          submitting || !rate || rate <= 0
            ? 'bg-zinc-300 dark:bg-zinc-800'
            : 'bg-[#7859d9] active:bg-[#6845cb]'
        }`}
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
              {isEditing ? 'Guardar Cambios' : 'Registrar Deuda'}
            </AppText>
          </>
        )}
      </TouchableOpacity>

      {/* Modal de Éxito Estilizado */}
      <ConfirmModal
        visible={successModalVisible}
        title={isEditing ? '¡Deuda Actualizada!' : '¡Deuda Registrada!'}
        message={`La deuda "${concepto}" por ${formatAmountByCurrency(
          moneda === 'USD' ? montoUsdCents : montoBsCents,
          moneda
        )} ha sido ${isEditing ? 'actualizada' : 'creada'} exitosamente.`}
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
    </View>
  );
}
