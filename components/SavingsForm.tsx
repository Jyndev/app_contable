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
  fromCents,
} from '@/utils/currency';
import { Ahorro, AhorroConProgreso, Moneda } from '@/database/types';
import { NewAhorroInput } from '@/hooks/useAhorros';
import { AppText } from '@/components/AppText';
import { ConfirmModal } from '@/components/ConfirmModal';
import { typography } from '@/constants/Typography';

interface SavingsFormProps {
  initialAhorro?: Ahorro | AhorroConProgreso | null;
  onSubmit: (data: NewAhorroInput) => Promise<number | void>;
  onClose?: () => void;
}

export function SavingsForm({ initialAhorro, onSubmit, onClose }: SavingsFormProps) {
  const { rate } = useExchangeRateStore();
  const isEditing = !!initialAhorro;
  const effectiveRate =
    initialAhorro && initialAhorro.tasa_cambio > 0
      ? initialAhorro.tasa_cambio
      : rate > 0
      ? rate
      : 1;

  const [titulo, setTitulo] = useState(initialAhorro?.titulo || '');
  const [montoStr, setMontoStr] = useState(
    initialAhorro
      ? fromCents(initialAhorro.moneda === 'BS' ? initialAhorro.monto_bs : initialAhorro.monto_usd).toString()
      : ''
  );
  const [moneda, setMoneda] = useState<Moneda>((initialAhorro?.moneda as Moneda) || 'USD');
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
        message: 'Debes configurar la tasa de cambio del día antes de registrar un objetivo de ahorro.',
      });
      return;
    }

    if (!titulo.trim()) {
      setErrorModalInfo({
        visible: true,
        title: 'Título requerido',
        message: 'Por favor indica el nombre o meta de tu ahorro (ej. Fondo de Emergencia, Vacaciones).',
      });
      return;
    }

    if (inputCents <= 0) {
      setErrorModalInfo({
        visible: true,
        title: 'Monto inválido',
        message: 'El monto objetivo debe ser mayor a 0.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        titulo: titulo.trim(),
        monto_objetivo: inputCents,
        moneda: moneda,
        monto_bs: montoBsCents,
        tasa_cambio: effectiveRate,
        monto_usd: montoUsdCents,
        fecha_creacion: initialAhorro?.fecha_creacion || new Date().toISOString(),
      });

      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorModalInfo({
        visible: true,
        title: isEditing ? 'Error al Actualizar' : 'Error al Registrar',
        message: err?.message || 'Ocurrió un problema al guardar el objetivo de ahorro.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuccessDone = () => {
    setSuccessModalVisible(false);
    if (!isEditing) {
      setTitulo('');
      setMontoStr('');
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <View className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-800/80 shadow-md">
      {/* Encabezado del Formulario */}
      <View className="flex-row items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-full bg-[#ECE7FF] dark:bg-purple-950/70 items-center justify-center">
            <Ionicons name="sparkles" size={16} color="#7859d9" />
          </View>
          <AppText weight="bold" className="text-base text-zinc-900 dark:text-zinc-100">
            {isEditing ? 'Editar Meta de Ahorro' : 'Nuevo Objetivo de Ahorro'}
          </AppText>
        </View>

        {onClose && (
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
          >
            <Ionicons name="close" size={16} color="#8a8a8e" />
          </TouchableOpacity>
        )}
      </View>

      <View className="mt-4 space-y-4">
        {/* Campo Título / Meta */}
        <View>
          <AppText weight="semibold" className="text-xs text-[#8a8a8e] mb-1.5 uppercase tracking-wider">
            Nombre del Objetivo
          </AppText>
          <View className="flex-row items-center bg-[#F6F7FB] dark:bg-zinc-800/60 rounded-2xl px-3.5 py-3 border border-transparent focus:border-[#7859d9]">
            <Ionicons name="bookmark-outline" size={18} color="#7859d9" style={{ marginRight: 8 }} />
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ej. Fondo de Emergencia, Vacaciones, Laptop..."
              placeholderTextColor="#aeaeaf"
              style={[typography.regular, { flex: 1, fontSize: 14 }]}
              className="text-zinc-900 dark:text-zinc-100 p-0"
              autoCapitalize="sentences"
            />
          </View>
        </View>

        {/* Moneda y Monto Objetivo */}
        <View>
          <View className="flex-row justify-between items-center mb-1.5">
            <AppText weight="semibold" className="text-xs text-[#8a8a8e] uppercase tracking-wider">
              Monto Meta
            </AppText>
            {/* Selector de Moneda */}
            <View className="flex-row bg-[#ECE7FF] dark:bg-zinc-800 p-0.5 rounded-xl">
              <TouchableOpacity
                onPress={() => setMoneda('USD')}
                className={`px-3 py-1 rounded-lg ${
                  moneda === 'USD' ? 'bg-[#7859d9]' : 'bg-transparent'
                }`}
              >
                <AppText
                  weight="bold"
                  className={`text-[11px] ${
                    moneda === 'USD' ? 'text-white' : 'text-[#7859d9] dark:text-zinc-300'
                  }`}
                >
                  USD ($)
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setMoneda('BS')}
                className={`px-3 py-1 rounded-lg ${
                  moneda === 'BS' ? 'bg-[#7859d9]' : 'bg-transparent'
                }`}
              >
                <AppText
                  weight="bold"
                  className={`text-[11px] ${
                    moneda === 'BS' ? 'text-white' : 'text-[#7859d9] dark:text-zinc-300'
                  }`}
                >
                  BS (Bs.)
                </AppText>
              </TouchableOpacity>
            </View>
          </View>

          <View className="flex-row items-center bg-[#F6F7FB] dark:bg-zinc-800/60 rounded-2xl px-3.5 py-3 border border-transparent focus:border-[#7859d9]">
            <AppText weight="bold" className="text-[#7859d9] text-base mr-2">
              {moneda === 'USD' ? '$' : 'Bs.'}
            </AppText>
            <TextInput
              value={montoStr}
              onChangeText={setMontoStr}
              placeholder="0.00"
              placeholderTextColor="#aeaeaf"
              keyboardType="decimal-pad"
              style={[typography.bold, { flex: 1, fontSize: 16 }]}
              className="text-zinc-900 dark:text-zinc-100 p-0"
            />
          </View>
        </View>

        {/* Tarjeta de Conversión Dual y Tasa */}
        <View className="bg-[#ECE7FF]/60 dark:bg-purple-950/30 rounded-2xl p-3 border border-purple-100 dark:border-purple-900/30">
          <View className="flex-row justify-between items-center mb-1">
            <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
              Tasa del día: <AppText weight="bold" className="text-[#7859d9] dark:text-purple-300">Bs. {effectiveRate.toFixed(2)}</AppText>
            </AppText>
            <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
              Equivalencia
            </AppText>
          </View>
          <View className="flex-row justify-between items-center">
            <AppText weight="bold" className="text-sm text-zinc-900 dark:text-zinc-100">
              {moneda === 'USD' ? formatUsd(montoUsdCents) : formatBs(montoBsCents)}
            </AppText>
            <AppText weight="extrabold" className="text-sm text-[#7859d9] dark:text-purple-300">
              ≈ {moneda === 'USD' ? formatBs(montoBsCents) : formatUsd(montoUsdCents)}
            </AppText>
          </View>
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={submitting}
          className="bg-[#7859d9] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 mt-2 shadow-sm"
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
              <AppText weight="bold" className="text-white text-sm">
                {isEditing ? 'Guardar Cambios' : 'Crear Objetivo de Ahorro'}
              </AppText>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de Éxito */}
      <ConfirmModal
        visible={successModalVisible}
        title={isEditing ? '¡Objetivo Actualizado!' : '¡Objetivo Creado!'}
        message={
          isEditing
            ? 'Los datos de tu objetivo de ahorro se actualizaron exitosamente.'
            : 'Tu meta de ahorro fue registrada. Ahora puedes comenzar a abonar tus aportes.'
        }
        variant="success"
        icon="checkmark-circle"
        confirmText="Aceptar"
        singleButton
        onConfirm={handleSuccessDone}
        onCancel={handleSuccessDone}
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
    </View>
  );
}
