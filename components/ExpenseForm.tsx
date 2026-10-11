import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { NewGastoInput } from '@/hooks/useGastos';
import { Gasto, Moneda } from '@/database/types';
import { fromCents } from '@/utils/currency';
import { AppText } from '@/components/AppText';
import { ConfirmModal } from '@/components/ConfirmModal';
import { typography } from '@/constants/Typography';

interface ExpenseFormProps {
  initialGasto?: Gasto | null;
  onSubmit: (data: NewGastoInput) => Promise<number | void>;
  onClose?: () => void;
}

const STORAGE_CUSTOM_CATEGORIES_KEY = '@custom_categories_list';

const DEFAULT_CATEGORIES = [
  { name: 'Alimentación', icon: 'fast-food-outline' },
  { name: 'Transporte', icon: 'bus-outline' },
  { name: 'Servicios', icon: 'flash-outline' },
  { name: 'Salud', icon: 'medkit-outline' },
  { name: 'Educación', icon: 'school-outline' },
  { name: 'Entretenimiento', icon: 'game-controller-outline' },
  { name: 'Hogar', icon: 'home-outline' },
  { name: 'Compras', icon: 'cart-outline' },
  { name: 'Otros', icon: 'ellipsis-horizontal-circle-outline' },
];

export function ExpenseForm({ initialGasto, onSubmit, onClose }: ExpenseFormProps) {
  const { rate } = useExchangeRateStore();
  const isEditing = !!initialGasto;

  const [moneda, setMoneda] = useState<Moneda>((initialGasto?.moneda as Moneda) || 'BS');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [categoria, setCategoria] = useState<string>(initialGasto?.categoria || DEFAULT_CATEGORIES[0].name);
  const [showNewCatInput, setShowNewCatInput] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [montoInput, setMontoInput] = useState<string>(
    initialGasto
      ? fromCents(initialGasto.moneda === 'USD' ? initialGasto.monto_usd : initialGasto.monto_bs).toString()
      : ''
  );
  const [descripcion, setDescripcion] = useState<string>(initialGasto?.descripcion || '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Estados para modales de confirmación/éxito
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModalInfo, setErrorModalInfo] = useState<{ visible: boolean; title: string; message: string }>({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (initialGasto) {
      setMoneda((initialGasto.moneda as Moneda) || 'BS');
      setCategoria(initialGasto.categoria || DEFAULT_CATEGORIES[0].name);
      setMontoInput(
        fromCents(initialGasto.moneda === 'USD' ? initialGasto.monto_usd : initialGasto.monto_bs).toString()
      );
      setDescripcion(initialGasto.descripcion || '');
    }
  }, [initialGasto]);

  // Cargar categorías personalizadas guardadas
  useEffect(() => {
    async function loadStoredCategories() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_CUSTOM_CATEGORIES_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomCategories(parsed);
          }
        }
      } catch (e) {
        console.warn('Error loading custom categories:', e);
      }
    }
    loadStoredCategories();
  }, []);

  // Agregar una nueva categoría personalizada y guardarla
  const handleAddNewCategory = useCallback(async () => {
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorModalInfo({
        visible: true,
        title: 'Nombre Requerido',
        message: 'Ingresa el nombre de la nueva categoría.',
      });
      return;
    }

    const allCurrentNames = [
      ...DEFAULT_CATEGORIES.map((c) => c.name.toLowerCase()),
      ...customCategories.map((c) => c.toLowerCase()),
    ];

    if (allCurrentNames.includes(trimmed.toLowerCase())) {
      setCategoria(trimmed);
      setShowNewCatInput(false);
      setNewCatName('');
      return;
    }

    const updated = [...customCategories, trimmed];
    setCustomCategories(updated);
    setCategoria(trimmed);
    setShowNewCatInput(false);
    setNewCatName('');

    try {
      await AsyncStorage.setItem(STORAGE_CUSTOM_CATEGORIES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Error saving custom category:', e);
    }
  }, [newCatName, customCategories]);

  // Conversión y cálculo de montos según la moneda seleccionada
  const { montoUsdCents, montoBsCents } = useMemo(() => {
    const inputCents = toCents(montoInput);
    if (moneda === 'USD') {
      const bsCents = rate > 0 ? calculateBsFromUsd(inputCents, rate) : 0;
      return {
        montoUsdCents: inputCents,
        montoBsCents: bsCents,
      };
    } else {
      const usdCents = rate > 0 ? calculateUsdFromBs(inputCents, rate) : 0;
      return {
        montoUsdCents: usdCents,
        montoBsCents: inputCents,
      };
    }
  }, [montoInput, moneda, rate]);

  const handleSubmit = async () => {
    if (!rate || rate <= 0) {
      setErrorModalInfo({
        visible: true,
        title: 'Tasa Requerida',
        message: 'Debes configurar una tasa de cambio válida antes de registrar un gasto.',
      });
      return;
    }

    if (!categoria.trim()) {
      setErrorModalInfo({
        visible: true,
        title: 'Categoría Requerida',
        message: 'Por favor selecciona o crea una categoría para el gasto.',
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
        categoria: categoria.trim(),
        descripcion: descripcion.trim() || undefined,
        moneda: moneda,
        monto_bs: montoBsCents,
        tasa_cambio: rate,
        monto_usd: montoUsdCents,
        fecha_gasto: initialGasto?.fecha_gasto || new Date().toISOString(),
      });

      setSuccessModalVisible(true);
    } catch (err: any) {
      setErrorModalInfo({
        visible: true,
        title: 'Error',
        message: err?.message || (isEditing ? 'No se pudo actualizar el gasto.' : 'No se pudo registrar el gasto.'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccessModalVisible(false);
    if (!isEditing) {
      setMontoInput('');
      setDescripcion('');
      setMoneda('BS');
    }
    if (onClose) onClose();
  };

  return (
    <View className="bg-white dark:bg-zinc-900 rounded-3xl p-5">
      {/* Header del Formulario */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-[#ECE7FF] items-center justify-center">
            <Ionicons name={isEditing ? 'create-outline' : 'receipt-outline'} size={18} color="#7859d9" />
          </View>
          <AppText
            weight="bold"
            className="text-lg text-zinc-900 dark:text-zinc-100"
          >
            {isEditing ? 'Editar Gasto' : 'Nuevo Gasto'}
          </AppText>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} className="p-1">
            <Ionicons name="close-outline" size={20} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* 1. Selector de Moneda */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide"
      >
        Moneda del Gasto
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
            Bolívares (Bs. BS)
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
            Dólares ($ USD)
          </AppText>
        </TouchableOpacity>
      </View>

      {/* 2. Selector de Categorías en Múltiples Líneas (Grid Wrap) */}
      <View className="flex-row justify-between items-center mb-2">
        <AppText
          weight="semibold"
          className="text-xs text-zinc-600 dark:text-zinc-400 uppercase tracking-wide"
        >
          Categoría
        </AppText>
        <TouchableOpacity
          onPress={() => setShowNewCatInput((prev) => !prev)}
          className="flex-row items-center"
        >
          <Ionicons
            name={showNewCatInput ? 'close-circle-outline' : 'add-circle-outline'}
            size={14}
            color="#7859d9"
          />
          <AppText weight="bold" className="text-xs text-[#7859d9] ml-1">
            {showNewCatInput ? 'Cancelar' : '+ Nueva'}
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Input para nueva categoría */}
      {showNewCatInput && (
        <View className="flex-row gap-2 mb-3">
          <TextInput
            value={newCatName}
            onChangeText={setNewCatName}
            placeholder="Nombre de la nueva categoría..."
            placeholderTextColor="#94a3b8"
            style={typography.medium}
            className="flex-1 bg-zinc-100 dark:bg-zinc-800 px-3.5 py-2 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700"
            autoFocus
          />
          <TouchableOpacity
            onPress={handleAddNewCategory}
            className="bg-[#7859d9] px-4 py-2 rounded-xl items-center justify-center"
          >
            <AppText weight="bold" className="text-white text-xs">
              Guardar
            </AppText>
          </TouchableOpacity>
        </View>
      )}

      {/* Chips en múltiples líneas */}
      <View className="flex-row flex-wrap gap-2 mb-4">
        {DEFAULT_CATEGORIES.map((cat) => {
          const isSelected = categoria === cat.name;
          return (
            <TouchableOpacity
              key={cat.name}
              onPress={() => setCategoria(cat.name)}
              className={`flex-row items-center px-3 py-2 rounded-xl border ${
                isSelected
                  ? 'bg-[#7859d9] border-[#7859d9]'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={isSelected ? '#ffffff' : '#7859d9'}
              />
              <AppText
                weight={isSelected ? 'bold' : 'medium'}
                className={`text-xs ml-1.5 ${
                  isSelected ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {cat.name}
              </AppText>
            </TouchableOpacity>
          );
        })}

        {customCategories.map((catName) => {
          const isSelected = categoria === catName;
          return (
            <TouchableOpacity
              key={catName}
              onPress={() => setCategoria(catName)}
              className={`flex-row items-center px-3 py-2 rounded-xl border ${
                isSelected
                  ? 'bg-[#7859d9] border-[#7859d9]'
                  : 'bg-purple-50 dark:bg-zinc-800 border-[#7859d9]/30'
              }`}
            >
              <Ionicons
                name="pricetag-outline"
                size={14}
                color={isSelected ? '#ffffff' : '#7859d9'}
              />
              <AppText
                weight={isSelected ? 'bold' : 'medium'}
                className={`text-xs ml-1.5 ${
                  isSelected ? 'text-white' : 'text-[#7859d9] dark:text-purple-300'
                }`}
              >
                {catName}
              </AppText>
            </TouchableOpacity>
          );
        })}
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

      {/* Tarjeta de Conversión Automática en Tiempo Real */}
      <View className="bg-[#ECE7FF] dark:bg-zinc-800 border border-[#7859d9]/20 rounded-2xl p-3.5 mb-4">
        <View className="flex-row justify-between items-center mb-1">
          <AppText weight="semibold" className="text-xs text-[#7859d9]">
            {moneda === 'USD' ? 'Equivalente en Bolívares (Bs):' : 'Equivalente en Dólares (USD):'}
          </AppText>
          <AppText weight="medium" className="text-[11px] text-[#7859d9]">
            Tasa: {rate > 0 ? `Bs. ${rate}` : 'No definida'}
          </AppText>
        </View>
        <AppText
          weight="extrabold"
          className="text-xl text-[#1a1a1a] dark:text-zinc-100"
        >
          {moneda === 'USD' ? formatBs(montoBsCents) : formatUsd(montoUsdCents)}
        </AppText>
      </View>

      {/* 4. Campo de Descripción / Detalle del Gasto */}
      <AppText
        weight="semibold"
        className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 uppercase tracking-wide"
      >
        Descripción / Detalle (Opcional)
      </AppText>
      <TextInput
        value={descripcion}
        onChangeText={setDescripcion}
        placeholder="Ej. Almuerzo de trabajo, compra en supermercado..."
        placeholderTextColor="#94a3b8"
        style={typography.medium}
        className="bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-2xl text-sm text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 mb-5"
      />

      {/* 5. Botón Guardar Gasto */}
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
            <AppText
              weight="bold"
              className="text-white text-sm ml-1.5"
            >
              {isEditing ? 'Guardar Cambios' : 'Guardar Gasto'}
            </AppText>
          </>
        )}
      </TouchableOpacity>

      {/* Modal de Éxito Estilizado */}
      <ConfirmModal
        visible={successModalVisible}
        title={isEditing ? '¡Gasto Actualizado!' : '¡Gasto Registrado!'}
        message={`Se ha ${isEditing ? 'actualizado' : 'registrado'} el gasto de ${categoria} por ${formatAmountByCurrency(
          moneda === 'USD' ? montoUsdCents : montoBsCents,
          moneda
        )} exitosamente.`}
        confirmText="Entendido"
        variant="success"
        singleButton
        icon="checkmark-circle-outline"
        onConfirm={handleCloseSuccess}
      />

      {/* Modal de Validación/Error Estilizado */}
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
