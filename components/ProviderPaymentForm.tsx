import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useExchangeRateStore } from '@/store/exchangeRateStore';
import {
  toCents,
  calculateUsdFromBs,
  calculateBsFromUsd,
  formatUsd,
  formatBs,
  formatAmountByCurrency,
} from '@/utils/currency';
import { Moneda } from '@/database/types';
import { NewPagoProveedorInput } from '@/hooks/useProveedores';
import { AppText } from '@/components/AppText';
import { ConfirmModal } from '@/components/ConfirmModal';
import { typography } from '@/constants/Typography';
import { formatMonthYearSpanish } from '@/components/MonthlyPaymentsCard';

interface ProviderPaymentFormProps {
  initialAssignedDate?: Date;
  knownProviders?: string[];
  onSubmit: (data: NewPagoProveedorInput) => Promise<number>;
  onClose?: () => void;
}

export function ProviderPaymentForm({
  initialAssignedDate = new Date(),
  knownProviders = [],
  onSubmit,
  onClose,
}: ProviderPaymentFormProps) {
  const { rate } = useExchangeRateStore();
  const [proveedor, setProveedor] = useState<string>('');
  const [moneda, setMoneda] = useState<Moneda>('BS');
  const [montoInput, setMontoInput] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Fecha física del pago (por defecto hoy)
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [fechaPago, setFechaPago] = useState<string>(todayDateStr);

  // Mes al que se asigna / imputa el pago (por defecto el mes seleccionado o actual)
  const [assignedDate, setAssignedDate] = useState<Date>(initialAssignedDate);

  // Modales estilizados
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalInfo, setErrorModalInfo] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  // Lista de meses sugeridos para asignación rápida
  const quickMonths = useMemo(() => {
    const now = new Date();
    const months = [];
    // -1: Mes pasado, 0: Mes actual, +1: Próximo mes, +2: En 2 meses
    for (let offset = -1; offset <= 3; offset++) {
      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const year = d.getFullYear();
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      months.push({
        date: d,
        key: `${year}-${mStr}`,
        label: formatMonthYearSpanish(d),
        isCurrent: offset === 0,
      });
    }
    return months;
  }, []);

  const assignedYearMonth = useMemo(() => {
    const year = assignedDate.getFullYear();
    const month = String(assignedDate.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, [assignedDate]);

  // Conversión dual
  const { montoUsdCents, montoBsCents } = useMemo(() => {
    const inputCents = toCents(montoInput);
    if (moneda === 'USD') {
      const bsCents = rate > 0 ? calculateBsFromUsd(inputCents, rate) : 0;
      return { montoUsdCents: inputCents, montoBsCents: bsCents };
    } else {
      const usdCents = rate > 0 ? calculateUsdFromBs(inputCents, rate) : 0;
      return { montoUsdCents: usdCents, montoBsCents: inputCents };
    }
  }, [montoInput, moneda, rate]);

  const handleSubmit = async () => {
    if (!rate || rate <= 0) {
      setErrorModalInfo({
        visible: true,
        title: 'Tasa Requerida',
        message: 'Debes configurar una tasa de cambio válida antes de registrar un pago.',
      });
      return;
    }

    if (!proveedor.trim()) {
      setErrorModalInfo({
        visible: true,
        title: 'Proveedor Requerido',
        message: 'Por favor indica el nombre del proveedor o empresa.',
      });
      return;
    }

    const inputCents = toCents(montoInput);
    if (inputCents <= 0) {
      setErrorModalInfo({
        visible: true,
        title: 'Monto Inválido',
        message: 'El monto ingresado debe ser mayor a 0.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        proveedor: proveedor.trim(),
        descripcion: descripcion.trim() || undefined,
        moneda: moneda,
        monto_bs: montoBsCents,
        tasa_cambio: rate,
        monto_usd: montoUsdCents,
        fecha_pago: fechaPago ? `${fechaPago}T12:00:00.000Z` : new Date().toISOString(),
        mes_asignado: assignedYearMonth,
      });

      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorModalInfo({
        visible: true,
        title: 'Error',
        message: err?.message || 'No se pudo registrar el pago al proveedor.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessModalVisible(false);
    setProveedor('');
    setMontoInput('');
    setDescripcion('');
    if (onClose) onClose();
  };

  return (
    <View className="bg-white dark:bg-zinc-900 rounded-3xl p-5">
      {/* Header del Formulario */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-[#ECE7FF] items-center justify-center">
            <Ionicons name="business-outline" size={18} color="#7859d9" />
          </View>
          <AppText
            weight="bold"
            className="text-lg text-zinc-900 dark:text-zinc-100"
          >
            Nuevo Pago a Proveedor
          </AppText>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close-outline" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* 1. Proveedor */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide"
      >
        Nombre del Proveedor / Empresa
      </AppText>
      <TextInput
        value={proveedor}
        onChangeText={setProveedor}
        placeholder="Ej. Distribuidora Polar, Mayorista San José..."
        placeholderTextColor="#94a3b8"
        style={typography.semibold}
        className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 mb-2"
      />

      {/* Sugerencias de Proveedores Frecuentes */}
      {knownProviders.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-1 px-1 mb-4"
        >
          <View className="flex-row gap-1.5">
            {knownProviders.map((name) => (
              <TouchableOpacity
                key={name}
                onPress={() => setProveedor(name)}
                className={`px-3 py-1 rounded-xl border ${
                  proveedor === name
                    ? 'bg-[#ECE7FF] dark:bg-zinc-800 border-[#7859d9]'
                    : 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700'
                }`}
              >
                <AppText
                  weight="medium"
                  className={`text-xs ${
                    proveedor === name ? 'text-[#7859d9]' : 'text-zinc-600 dark:text-zinc-300'
                  }`}
                >
                  {name}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* 2. Selector de Moneda */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide"
      >
        Moneda del Pago
      </AppText>
      <View className="flex-row gap-2 mb-4">
        <TouchableOpacity
          onPress={() => setMoneda('BS')}
          className={`flex-1 py-2.5 rounded-xl items-center border ${
            moneda === 'BS'
              ? 'bg-[#7859d9] border-[#7859d9]'
              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <AppText
            weight="bold"
            className={`text-xs ${moneda === 'BS' ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}
          >
            Bs. Bolívares (BS)
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMoneda('USD')}
          className={`flex-1 py-2.5 rounded-xl items-center border ${
            moneda === 'USD'
              ? 'bg-[#7859d9] border-[#7859d9]'
              : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
          }`}
        >
          <AppText
            weight="bold"
            className={`text-xs ${moneda === 'USD' ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'}`}
          >
            $ Dólares (USD)
          </AppText>
        </TouchableOpacity>
      </View>

      {/* 3. Input Monto */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide"
      >
        Monto ({moneda === 'USD' ? '$ Dólares' : 'Bs. Bolívares'})
      </AppText>
      <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 border border-zinc-200 dark:border-zinc-700 mb-3">
        <AppText
          weight="bold"
          className="text-lg text-zinc-500 dark:text-zinc-400 mr-2"
        >
          {moneda === 'USD' ? '$' : 'Bs.'}
        </AppText>
        <TextInput
          value={montoInput}
          onChangeText={setMontoInput}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#94a3b8"
          style={typography.bold}
          className="flex-1 text-xl text-zinc-900 dark:text-zinc-100"
        />
      </View>

      {/* Tarjeta de Conversión en Tiempo Real */}
      <View className="bg-[#ECE7FF] dark:bg-zinc-800 border border-[#7859d9]/20 rounded-2xl p-3.5 mb-4">
        <View className="flex-row justify-between items-center mb-1">
          <AppText weight="semibold" className="text-xs text-[#7859d9]">
            {moneda === 'USD' ? 'Equivalente en Bolívares:' : 'Equivalente en Dólares:'}
          </AppText>
          <AppText weight="medium" className="text-[11px] text-[#7859d9]">
            Tasa: {rate > 0 ? `Bs. ${rate}` : '1.00'}
          </AppText>
        </View>
        <AppText
          weight="extrabold"
          className="text-xl text-[#1a1a1a] dark:text-zinc-100"
        >
          {moneda === 'USD' ? formatBs(montoBsCents) : formatUsd(montoUsdCents)}
        </AppText>
      </View>

      {/* 4. Asignación de Mes (Mes donde se imputará el pago) */}
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-1.5">
          <AppText
            weight="semibold"
            className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-wide"
          >
            Mes al que se Asigna el Pago
          </AppText>
          <AppText weight="bold" className="text-xs text-[#7859d9]">
            {formatMonthYearSpanish(assignedDate)}
          </AppText>
        </View>

        <AppText weight="regular" className="text-[11px] text-[#8a8a8e] mb-2 leading-4">
          Selecciona el mes contable donde se reflejará este gasto:
        </AppText>

        {/* Chips de selección rápida de mes */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-1 px-1 mb-2"
        >
          <View className="flex-row gap-2">
            {quickMonths.map((m) => {
              const isSelected = assignedYearMonth === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setAssignedDate(m.date)}
                  className={`px-3.5 py-2 rounded-xl border ${
                    isSelected
                      ? 'bg-[#7859d9] border-[#7859d9]'
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <AppText
                    weight={isSelected ? 'bold' : 'medium'}
                    className={`text-xs ${
                      isSelected ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {m.label} {m.isCurrent ? '• Actual' : ''}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* 5. Fecha Real del Pago */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide"
      >
        Fecha Real de la Transacción (AAAA-MM-DD)
      </AppText>
      <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 border border-zinc-200 dark:border-zinc-700 mb-4">
        <Ionicons name="calendar-outline" size={18} color="#7859d9" />
        <TextInput
          value={fechaPago}
          onChangeText={setFechaPago}
          placeholder="AAAA-MM-DD"
          placeholderTextColor="#94a3b8"
          style={typography.semibold}
          className="flex-1 ml-2 text-sm text-zinc-900 dark:text-zinc-100"
          maxLength={10}
        />
        {fechaPago !== todayDateStr && (
          <TouchableOpacity onPress={() => setFechaPago(todayDateStr)} className="bg-white dark:bg-zinc-700 px-2 py-1 rounded-lg">
            <AppText weight="bold" className="text-[10px] text-[#7859d9]">
              Hoy
            </AppText>
          </TouchableOpacity>
        )}
      </View>

      {/* 6. Descripción / Factura (Opcional) */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide"
      >
        Descripción / Factura / Nota (Opcional)
      </AppText>
      <TextInput
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Ej. Factura #4092, abono pedido mercancía..."
        placeholderTextColor="#94a3b8"
        style={typography.medium}
        className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 mb-5"
      />

      {/* 7. Botón Guardar */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting || !rate || rate <= 0}
        className={`py-3.5 rounded-2xl flex-row items-center justify-center ${
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
            <AppText weight="bold" className="text-white text-sm ml-1.5">
              Guardar Pago al Proveedor
            </AppText>
          </>
        )}
      </TouchableOpacity>

      {/* Modal de Éxito Estilizado */}
      <ConfirmModal
        visible={successModalVisible}
        title="¡Pago Registrado!"
        message={`Se registró el pago a ${proveedor} por ${formatAmountByCurrency(
          moneda === 'USD' ? montoUsdCents : montoBsCents,
          moneda
        )} asignado a ${formatMonthYearSpanish(assignedDate)}.`}
        confirmText="Entendido"
        variant="success"
        singleButton
        icon="checkmark-circle-outline"
        onConfirm={handleCloseSuccess}
      />

      {/* Modal de Error/Validación */}
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
