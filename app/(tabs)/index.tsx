import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDashboard } from '@/hooks/useDashboard';
import { useExchangeRateStore } from '@/store/exchangeRateStore';
import { DashboardHeroCard, formatMonthYearSpanish } from '@/components/DashboardHeroCard';
import { BcvCalculatorCard } from '@/components/BcvCalculatorCard';
import { ExpenseForm } from '@/components/ExpenseForm';
import { DebtForm } from '@/components/DebtForm';
import { useGastos } from '@/hooks/useGastos';
import { useDeudas } from '@/hooks/useDeudas';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { exportDatabaseBackup, importDatabaseBackup } from '@/utils/exportService';
import { ConfirmModal } from '@/components/ConfirmModal';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { formatUsd, formatBs, formatFriendlyDate } from '@/utils/currency';
import { AppText } from '@/components/AppText';
import { typography } from '@/constants/Typography';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Alimentación: 'fast-food',
  Transporte: 'bus',
  Servicios: 'flash',
  Salud: 'medkit',
  Educación: 'school',
  Entretenimiento: 'game-controller',
  Hogar: 'home',
  Compras: 'cart',
  Otros: 'ellipsis-horizontal-circle',
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { bottomInset, isKeyboardVisible } = useKeyboardBottomInset(insets.bottom);
  const {
    stats,
    loading,
    refreshDashboard,
    fetchDashboardData,
    db,
    selectedDate,
    isCurrentMonth,
    changeMonth,
    resetToCurrentMonth,
  } = useDashboard();
  const { insertGasto, updateGasto } = useGastos();
  const { insertDeuda } = useDeudas();
  const { rate, setManualRate, resetToBcv } = useExchangeRateStore();

  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [selectDebtModalVisible, setSelectDebtModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [debtModalVisible, setDebtModalVisible] = useState(false);
  const [inputRate, setInputRate] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmImportVisible, setConfirmImportVisible] = useState(false);

  const handleExportBackup = async () => {
    try {
      setExporting(true);
      await exportDatabaseBackup(db);
    } catch (err: any) {
      Alert.alert('Error al exportar', err?.message || 'No se pudo generar el respaldo');
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      setImporting(true);
      const res = await importDatabaseBackup(db);
      if (res) {
        await refreshDashboard();
        Alert.alert(
          '¡Respaldo Restaurado!',
          `Se restauraron exitosamente:\n• ${res.deudasCount} deudas\n• ${res.pagosCount} abonos\n• ${res.gastosCount} gastos\n• ${res.pagosProveedoresCount} pagos a proveedores.`
        );
      }
    } catch (err: any) {
      Alert.alert('Error al restaurar', err?.message || 'No se pudo cargar el respaldo');
    } finally {
      setImporting(false);
      setConfirmImportVisible(false);
    }
  };

  const handleOpenRateModal = () => {
    setInputRate(rate > 1 ? rate.toString() : '');
    setRateModalVisible(true);
  };

  const handleSaveManualRate = () => {
    const parsed = parseFloat(inputRate.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Valor Inválido', 'Ingresa una tasa numérica válida mayor a 0.');
      return;
    }
    setManualRate(parsed);
    setRateModalVisible(false);
  };

  const handleSyncBcv = async () => {
    try {
      setSyncing(true);
      const res = await resetToBcv();
      if (res) {
        Alert.alert('Tasa Sincronizada', `Tasa oficial BCV: Bs. ${res.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
        setRateModalVisible(false);
      } else {
        Alert.alert('Aviso', 'No se pudo consultar el BCV en línea.');
      }
    } finally {
      setSyncing(false);
    }
  };

  const headerMonthTitle = formatMonthYearSpanish(selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-[#F6F7FB] dark:bg-[#121214]" edges={['top']}>
      <BackgroundDecorations />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refreshDashboard}
            tintColor="#7859d9"
            colors={['#7859d9']}
          />
        }
      >
        {/* 1. Header Bar: Nombre del mes actual / seleccionado con botón de Modo Oscuro a la derecha */}
        <View className="flex-row items-center justify-between pt-2 pb-2 mb-3">
          <View className="w-9" />
          <TouchableOpacity
            activeOpacity={isCurrentMonth ? 1 : 0.7}
            onPress={isCurrentMonth ? undefined : resetToCurrentMonth}
            className="items-center"
          >
            <AppText
              weight="extrabold"
              className="text-lg text-[#1a1a1a] dark:text-zinc-100 tracking-tight text-center"
            >
              {headerMonthTitle}
            </AppText>
            {!isCurrentMonth && (
              <View className="bg-[#ECE7FF] dark:bg-zinc-800 px-2 py-0.5 rounded-full mt-0.5">
                <AppText weight="bold" className="text-[#7859d9] text-[10px]">
                  Volver a este mes
                </AppText>
              </View>
            )}
          </TouchableOpacity>
          <ThemeToggleButton />
        </View>

        {/* 2. Card Principal: Resumen Financiero con Selector de Gastos / Deudas / Abonos y Swipe de Meses */}
        <DashboardHeroCard
          selectedDate={selectedDate}
          stats={stats}
          onPrevMonth={() => changeMonth(-1)}
          onNextMonth={() => changeMonth(1)}
          onResetToCurrentMonth={resetToCurrentMonth}
          isCurrentMonth={isCurrentMonth}
        />

        {/* 3. Cuadrícula de Métricas Clave (Gastos, Deudas, Abonos, Proveedores) */}
        <View className="mb-5">
          <View className="flex-row items-center justify-between mb-2.5 px-1">
            <AppText weight="bold" className="text-sm text-zinc-900 dark:text-zinc-100">
              Resumen del Mes
            </AppText>
            <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
              {headerMonthTitle}
            </AppText>
          </View>

          <View className="flex-row gap-3 mb-3">
            {/* Tarjeta 1: Total Gastos Mes */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/gastos')}
              className="flex-1 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 items-center justify-center">
                  <Ionicons name="receipt-outline" size={16} color="#7859d9" />
                </View>
                <View className="bg-[#ECE7FF] dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  <AppText weight="semibold" className="text-[#7859d9] text-[10px]">
                    {stats.cantidadGastosMes} {stats.cantidadGastosMes === 1 ? 'gasto' : 'gastos'}
                  </AppText>
                </View>
              </View>
              <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                Gastos del Mes
              </AppText>
              <AppText weight="extrabold" className="text-base text-zinc-900 dark:text-zinc-100 mt-0.5" numberOfLines={1}>
                {formatUsd(stats.totalGastosMesUsd)}
              </AppText>
              <AppText weight="medium" className="text-[11px] text-[#8a8a8e]" numberOfLines={1}>
                ≈ {formatBs(stats.totalGastosMesBs)}
              </AppText>
            </TouchableOpacity>

            {/* Tarjeta 2: Deudas Pendientes */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/deudas')}
              className="flex-1 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 items-center justify-center">
                  <Ionicons name="card-outline" size={16} color="#d97706" />
                </View>
                <View className="bg-amber-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  <AppText weight="semibold" className="text-amber-600 dark:text-amber-400 text-[10px]">
                    {stats.cantidadDeudasPendientes} {stats.cantidadDeudasPendientes === 1 ? 'activa' : 'activas'}
                  </AppText>
                </View>
              </View>
              <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                Deudas Pendientes
              </AppText>
              <AppText weight="extrabold" className="text-base text-zinc-900 dark:text-zinc-100 mt-0.5" numberOfLines={1}>
                {formatUsd(stats.totalDeudasPendientesUsd)}
              </AppText>
              <AppText weight="medium" className="text-[11px] text-[#8a8a8e]" numberOfLines={1}>
                ≈ {formatBs(stats.totalDeudasPendientesBs)}
              </AppText>
            </TouchableOpacity>
          </View>

          <View className="flex-row gap-3">
            {/* Tarjeta 3: Abonos a Deudas */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setSelectDebtModalVisible(true)}
              className="flex-1 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center">
                  <Ionicons name="cash-outline" size={16} color="#059669" />
                </View>
                <View className="bg-emerald-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  <AppText weight="semibold" className="text-emerald-600 dark:text-emerald-400 text-[10px]">
                    {stats.monthlyPayments.cantidadPagos} {stats.monthlyPayments.cantidadPagos === 1 ? 'abono' : 'abonos'}
                  </AppText>
                </View>
              </View>
              <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                Abonos del Mes
              </AppText>
              <AppText weight="extrabold" className="text-base text-zinc-900 dark:text-zinc-100 mt-0.5" numberOfLines={1}>
                {formatUsd(stats.monthlyPayments.totalPagosUsd)}
              </AppText>
              <AppText weight="medium" className="text-[11px] text-[#8a8a8e]" numberOfLines={1}>
                ≈ {formatBs(stats.monthlyPayments.totalPagosBs)}
              </AppText>
            </TouchableOpacity>

            {/* Tarjeta 4: Pagos a Proveedores */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/proveedores')}
              className="flex-1 bg-white dark:bg-zinc-900 p-3.5 rounded-2xl border border-zinc-100 dark:border-zinc-800/80"
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 items-center justify-center">
                  <Ionicons name="business-outline" size={16} color="#2563eb" />
                </View>
                <View className="bg-blue-50 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                  <AppText weight="semibold" className="text-blue-600 dark:text-blue-400 text-[10px]">
                    {stats.cantidadProveedoresMes} {stats.cantidadProveedoresMes === 1 ? 'pago' : 'pagos'}
                  </AppText>
                </View>
              </View>
              <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                A Proveedores
              </AppText>
              <AppText weight="extrabold" className="text-base text-zinc-900 dark:text-zinc-100 mt-0.5" numberOfLines={1}>
                {formatUsd(stats.totalProveedoresMesUsd)}
              </AppText>
              <AppText weight="medium" className="text-[11px] text-[#8a8a8e]" numberOfLines={1}>
                ≈ {formatBs(stats.totalProveedoresMesBs)}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Fila de Acciones Rápidas (Nuevo Gasto, Nueva Deuda, Abonar Deuda, Tasa BCV) */}
        <View className="flex-row justify-between items-center px-2 mb-6">
          {/* Acción 1: Nuevo Gasto */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setExpenseModalVisible(true)}
            className="items-center flex-1"
          >
            <View style={styles.actionButtonShadow} className="w-14 h-14 rounded-full bg-[#7859d9] items-center justify-center">
              <Ionicons name="receipt-outline" size={24} color="#ffffff" />
            </View>
            <AppText
              weight="semibold"
              className="text-[12px] text-[#1a1a1a] dark:text-zinc-300 mt-2 text-center"
            >
              Nuevo Gasto
            </AppText>
          </TouchableOpacity>

          {/* Acción 2: Nueva Deuda */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDebtModalVisible(true)}
            className="items-center flex-1"
          >
            <View style={styles.actionButtonShadow} className="w-14 h-14 rounded-full bg-[#7859d9] items-center justify-center">
              <Ionicons name="card-outline" size={24} color="#ffffff" />
            </View>
            <AppText
              weight="semibold"
              className="text-[12px] text-[#1a1a1a] dark:text-zinc-300 mt-2 text-center"
            >
              Nueva Deuda
            </AppText>
          </TouchableOpacity>

          {/* Acción 3: Agregar Abono a Deuda */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectDebtModalVisible(true)}
            className="items-center flex-1"
          >
            <View style={styles.actionButtonShadow} className="w-14 h-14 rounded-full bg-[#7859d9] items-center justify-center">
              <Ionicons name="cash-outline" size={24} color="#ffffff" />
            </View>
            <AppText
              weight="semibold"
              className="text-[12px] text-[#1a1a1a] dark:text-zinc-300 mt-2 text-center"
            >
              Abonar Deuda
            </AppText>
          </TouchableOpacity>

          {/* Acción 4: Tasa BCV */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleOpenRateModal}
            className="items-center flex-1"
          >
            <View style={styles.actionButtonShadow} className="w-14 h-14 rounded-full bg-[#7859d9] items-center justify-center">
              <Ionicons name="trending-up-outline" size={24} color="#ffffff" />
            </View>
            <AppText
              weight="semibold"
              className="text-[12px] text-[#1a1a1a] dark:text-zinc-300 mt-2 text-center"
            >
              Tasa BCV
            </AppText>
          </TouchableOpacity>
        </View>

        {/* 5. Sección: Últimos Gastos Registrados */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <AppText weight="bold" className="text-base text-[#1a1a1a] dark:text-zinc-100">
              Últimos Gastos
            </AppText>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/gastos')}
              className="flex-row items-center"
            >
              <AppText weight="bold" className="text-[#7859d9] text-xs mr-0.5">
                Ver todos
              </AppText>
              <Ionicons name="chevron-forward" size={14} color="#7859d9" />
            </TouchableOpacity>
          </View>

          {stats.ultimosGastos.length === 0 ? (
            <View className="bg-white dark:bg-zinc-900 rounded-2xl p-5 items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800">
              <View className="w-10 h-10 rounded-full bg-[#ECE7FF] dark:bg-zinc-800 items-center justify-center mb-2">
                <Ionicons name="receipt-outline" size={20} color="#7859d9" />
              </View>
              <AppText weight="semibold" className="text-xs text-zinc-700 dark:text-zinc-300 text-center">
                Aún no tienes gastos registrados
              </AppText>
              <TouchableOpacity
                onPress={() => setExpenseModalVisible(true)}
                className="mt-2.5 bg-[#7859d9] px-4 py-2 rounded-xl flex-row items-center"
              >
                <Ionicons name="add" size={14} color="#ffffff" />
                <AppText weight="bold" className="text-white text-xs ml-1">
                  Registrar Gasto
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-white dark:bg-zinc-900 rounded-3xl p-3 border border-zinc-100 dark:border-zinc-800/80">
              {stats.ultimosGastos.map((gasto, index) => {
                const iconName = CATEGORY_ICONS[gasto.categoria] || 'pricetag';
                const isLast = index === stats.ultimosGastos.length - 1;

                return (
                  <View
                    key={gasto.id}
                    className={`flex-row items-center justify-between p-2.5 ${
                      !isLast ? 'border-b border-zinc-100 dark:border-zinc-800/60' : ''
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 rounded-2xl bg-[#ECE7FF] dark:bg-zinc-800 items-center justify-center shrink-0">
                        <Ionicons name={iconName} size={18} color="#7859d9" />
                      </View>
                      <View className="flex-1 ml-2.5">
                        <AppText weight="bold" className="text-sm text-zinc-900 dark:text-zinc-100" numberOfLines={1}>
                          {gasto.categoria}
                        </AppText>
                        <AppText weight="medium" className="text-[11px] text-[#8a8a8e]" numberOfLines={1}>
                          {gasto.descripcion || formatFriendlyDate(gasto.fecha_gasto)}
                        </AppText>
                      </View>
                    </View>

                    <View className="items-end shrink-0">
                      <AppText weight="extrabold" className="text-sm text-rose-600 dark:text-rose-400">
                        - {formatUsd(gasto.monto_usd)}
                      </AppText>
                      <AppText weight="medium" className="text-[10px] text-[#8a8a8e]">
                        ≈ {formatBs(gasto.monto_bs)}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 6. Sección: Objetivos de Ahorro */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <View className="flex-row items-center gap-2">
              <AppText weight="bold" className="text-base text-[#1a1a1a] dark:text-zinc-100">
                Metas de Ahorro
              </AppText>
              <View className="bg-[#ECE7FF] dark:bg-purple-950/60 px-2 py-0.5 rounded-full">
                <AppText weight="bold" className="text-[#7859d9] dark:text-purple-300 text-[10px]">
                  {stats.porcentajeGlobalAhorro}% Ahorrado
                </AppText>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/(tabs)/ahorros' as any)}
              className="flex-row items-center"
            >
              <AppText weight="bold" className="text-[#7859d9] text-xs mr-0.5">
                Ver metas
              </AppText>
              <Ionicons name="chevron-forward" size={14} color="#7859d9" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/(tabs)/ahorros' as any)}
            className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-100 dark:border-zinc-800/80 shadow-sm"
          >
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-2xl bg-[#ECE7FF] dark:bg-purple-950/70 items-center justify-center">
                  <Ionicons name="sparkles" size={20} color="#7859d9" />
                </View>
                <View>
                  <AppText weight="bold" className="text-sm text-zinc-900 dark:text-zinc-100">
                    Total Acumulado
                  </AppText>
                  <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                    {stats.cantidadAhorrosActivos} {stats.cantidadAhorrosActivos === 1 ? 'meta activa' : 'metas activas'}
                  </AppText>
                </View>
              </View>

              <View className="items-end">
                <AppText weight="extrabold" className="text-base text-[#7859d9] dark:text-purple-300">
                  {formatUsd(stats.totalAhorradoGeneralUsd)}
                </AppText>
                <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                  ≈ {formatBs(stats.totalAhorradoGeneralBs)}
                </AppText>
              </View>
            </View>

            <View className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <View className="flex-row justify-between items-center mb-1.5">
                <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                  Meta total: {formatUsd(stats.totalObjetivoGeneralUsd)}
                </AppText>
                <AppText weight="bold" className="text-[11px] text-[#7859d9] dark:text-purple-300">
                  {stats.porcentajeGlobalAhorro}%
                </AppText>
              </View>
              <View className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <View
                  className="h-full bg-[#7859d9] rounded-full"
                  style={{ width: `${stats.porcentajeGlobalAhorro}%` }}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* 7. Calculadora Rápida Dólar BCV con Conversión Dual y Copia de Monto */}
        <BcvCalculatorCard />

        {/* 7. Sección de Copia de Seguridad & Respaldos (Descargar / Cargar) */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <AppText
              weight="bold"
              className="text-base text-[#1a1a1a] dark:text-zinc-100"
            >
              Copia de Seguridad
            </AppText>
            <View className="bg-[#ECE7FF] dark:bg-zinc-800 px-2.5 py-0.5 rounded-full">
              <AppText
                weight="bold"
                className="text-[#7859d9] text-[11px]"
              >
                JSON
              </AppText>
            </View>
          </View>

          <View className="flex-row gap-3">
            {/* Botón Descargar / Exportar Respaldo */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleExportBackup}
              disabled={exporting || importing}
              className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-3xl"
            >
              <View className="w-10 h-10 rounded-2xl bg-[#ECE7FF] dark:bg-zinc-800 items-center justify-center mb-3">
                {exporting ? (
                  <ActivityIndicator size="small" color="#7859d9" />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={20} color="#7859d9" />
                )}
              </View>
              <AppText
                weight="bold"
                className="text-sm text-zinc-900 dark:text-zinc-100"
              >
                Descargar
              </AppText>
              <AppText
                weight="medium"
                className="text-[11px] text-[#8a8a8e] mt-0.5"
              >
                Exportar respaldo
              </AppText>
            </TouchableOpacity>

            {/* Botón Cargar / Importar Respaldo */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => setConfirmImportVisible(true)}
              disabled={exporting || importing}
              className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-3xl"
            >
              <View className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center mb-3">
                {importing ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <Ionicons name="cloud-download-outline" size={20} color="#059669" />
                )}
              </View>
              <AppText
                weight="bold"
                className="text-sm text-zinc-900 dark:text-zinc-100"
              >
                Cargar
              </AppText>
              <AppText
                weight="medium"
                className="text-[11px] text-[#8a8a8e] mt-0.5"
              >
                Restaurar archivo
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal de Confirmación para Restaurar Respaldo */}
      <ConfirmModal
        visible={confirmImportVisible}
        title="Restaurar Respaldo"
        message="¿Deseas seleccionar un archivo JSON de respaldo? Esta acción reemplazará la información actual de deudas, abonos y gastos con los datos del archivo."
        confirmText="Seleccionar Archivo"
        cancelText="Cancelar"
        variant="primary"
        icon="cloud-download-outline"
        loading={importing}
        onConfirm={handleImportBackup}
        onCancel={() => setConfirmImportVisible(false)}
      />

      {/* Modal para Registrar Nuevo Gasto directamente desde el Dashboard */}
      <Modal
        visible={expenseModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setExpenseModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            paddingBottom: bottomInset,
          }}
        >
          <View
            style={{
              maxHeight: isKeyboardVisible ? '68%' : '88%',
            }}
            className="bg-white dark:bg-zinc-900 rounded-t-3xl overflow-hidden p-5"
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
            >
              <ExpenseForm
                onSubmit={async (data) => {
                  const id = await insertGasto(data);
                  setExpenseModalVisible(false);
                  await fetchDashboardData(false);
                  return id;
                }}
                onClose={() => setExpenseModalVisible(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para Registrar Nueva Deuda directamente desde el Dashboard */}
      <Modal
        visible={debtModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setDebtModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            paddingBottom: bottomInset,
          }}
        >
          <View
            style={{
              maxHeight: isKeyboardVisible ? '68%' : '88%',
            }}
            className="bg-white dark:bg-zinc-900 rounded-t-3xl overflow-hidden p-5"
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
            >
              <DebtForm
                onSubmit={async (data) => {
                  const id = await insertDeuda(data);
                  setDebtModalVisible(false);
                  await fetchDashboardData(false);
                  return id;
                }}
                onClose={() => setDebtModalVisible(false)}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para Seleccionar Deuda a Abonar */}
      <Modal
        visible={selectDebtModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setSelectDebtModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View
            style={{
              paddingBottom: Math.max(insets.bottom, 24),
            }}
            className="bg-white dark:bg-zinc-900 rounded-t-3xl p-6 max-h-[85%]"
          >
            <View className="w-12 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full self-center mb-4" />

            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-[#ECE7FF] items-center justify-center">
                  <Ionicons name="cash-outline" size={18} color="#7859d9" />
                </View>
                <View>
                  <AppText
                    weight="bold"
                    className="text-base text-[#1a1a1a] dark:text-zinc-100"
                  >
                    Selecciona una Deuda
                  </AppText>
                  <AppText
                    weight="medium"
                    className="text-[11px] text-[#8a8a8e]"
                  >
                    {stats.deudasActivas.length} deuda(s) activa(s)
                  </AppText>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setSelectDebtModalVisible(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close-outline" size={18} color="#8a8a8e" />
              </TouchableOpacity>
            </View>

            {stats.deudasActivas.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <View className="w-16 h-16 rounded-full bg-[#ECE7FF] items-center justify-center mb-3">
                  <Ionicons name="checkmark-done-circle-outline" size={32} color="#7859d9" />
                </View>
                <AppText
                  weight="bold"
                  className="text-base text-zinc-800 dark:text-zinc-200 text-center"
                >
                  No tienes deudas pendientes
                </AppText>
                <AppText
                  weight="medium"
                  className="text-xs text-[#8a8a8e] text-center mt-1 mb-5"
                >
                  ¡Excelente! Todos tus compromisos están totalmente al día.
                </AppText>
                <TouchableOpacity
                  onPress={() => {
                    setSelectDebtModalVisible(false);
                    router.push('/(tabs)/deudas');
                  }}
                  className="bg-[#7859d9] px-5 py-3 rounded-2xl flex-row items-center"
                >
                  <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                  <AppText weight="bold" className="text-white text-xs ml-1.5">
                    Registrar Nueva Deuda
                  </AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="my-2">
                {stats.deudasActivas.map((deuda) => {
                  const percent = deuda.monto_total > 0
                    ? Math.min(100, Math.max(0, Math.round((deuda.total_pagado / deuda.monto_total) * 100)))
                    : 0;

                  return (
                    <TouchableOpacity
                      key={deuda.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectDebtModalVisible(false);
                        router.push(`/deudas/${deuda.id}?openPayment=true` as any);
                      }}
                      className="bg-zinc-50 dark:bg-zinc-800/70 p-4 rounded-2xl mb-3 flex-row items-center justify-between"
                    >
                      <View className="flex-1 mr-3">
                        <AppText
                          weight="bold"
                          className="text-sm text-zinc-900 dark:text-zinc-100"
                          numberOfLines={1}
                        >
                          {deuda.concepto}
                        </AppText>
                        <AppText
                          weight="semibold"
                          className="text-xs text-[#7859d9] mt-0.5"
                        >
                          Saldo: {formatUsd(deuda.saldo_pendiente_usd)} ≈ {formatBs(deuda.saldo_pendiente_bs)}
                        </AppText>

                        {/* Barra de progreso */}
                        <View className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full mt-2 overflow-hidden">
                          <View
                            className="h-full bg-[#7859d9] rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </View>
                      </View>

                      <View className="flex-row items-center">
                        <View className="bg-[#7859d9] px-3 py-1.5 rounded-xl flex-row items-center">
                          <AppText weight="bold" className="text-white text-xs mr-1">
                            Abonar
                          </AppText>
                          <Ionicons name="chevron-forward" size={14} color="#ffffff" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setSelectDebtModalVisible(false)}
              className="py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl items-center mt-2"
            >
              <AppText
                weight="semibold"
                className="text-xs text-zinc-600 dark:text-zinc-300"
              >
                Cerrar
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Ajuste de Tasa de Cambio */}
      <Modal
        visible={rateModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setRateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <View className="flex-1 justify-center items-center bg-black/50 px-5">
            <View className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-zinc-100 dark:border-zinc-800">
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-[#ECE7FF] items-center justify-center">
                    <Ionicons name="cash-outline" size={18} color="#7859d9" />
                  </View>
                  <AppText
                    weight="extrabold"
                    className="text-base text-[#1a1a1a] dark:text-zinc-100"
                  >
                    Tasa de Cambio (USD/BS)
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={() => setRateModalVisible(false)}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                >
                  <Ionicons name="close-outline" size={18} color="#8a8a8e" />
                </TouchableOpacity>
              </View>

              <AppText
                weight="regular"
                className="text-xs text-[#8a8a8e] mb-3 leading-4"
              >
                Ajusta manualmente el valor en Bolívares de 1 USD o sincroniza la cotización oficial del BCV:
              </AppText>

              <View className="flex-row items-center bg-[#F6F7FB] dark:bg-zinc-800 rounded-2xl px-4 py-3 mb-4 border border-zinc-200 dark:border-zinc-700">
                <AppText
                  weight="bold"
                  className="text-sm text-[#7859d9] mr-2"
                >
                  Bs.
                </AppText>
                <TextInput
                  value={inputRate}
                  onChangeText={setInputRate}
                  keyboardType="decimal-pad"
                  placeholder="Ej. 850.00"
                  placeholderTextColor="#aeaeaf"
                  style={typography.bold}
                  className="flex-1 text-base text-zinc-900 dark:text-zinc-100"
                  autoFocus
                />
              </View>

              <TouchableOpacity
                onPress={handleSyncBcv}
                disabled={syncing}
                className="py-2.5 px-3 bg-[#ECE7FF] dark:bg-zinc-800 rounded-xl flex-row items-center justify-center mb-4 border border-[#7859d9]/20"
              >
                {syncing ? (
                  <ActivityIndicator size="small" color="#7859d9" />
                ) : (
                  <>
                    <Ionicons name="cloud-download-outline" size={16} color="#7859d9" />
                    <AppText
                      weight="bold"
                      className="text-[#7859d9] text-xs ml-1.5"
                    >
                      Consultar Tasa Oficial BCV
                    </AppText>
                  </>
                )}
              </TouchableOpacity>

              <View className="flex-row gap-2.5">
                <TouchableOpacity
                  onPress={() => setRateModalVisible(false)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl items-center"
                >
                  <AppText
                    weight="semibold"
                    className="text-xs text-zinc-600 dark:text-zinc-300"
                  >
                    Cancelar
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveManualRate}
                  className="flex-1 py-3 bg-[#7859d9] active:bg-[#6845cb] rounded-2xl items-center"
                >
                  <AppText
                    weight="bold"
                    className="text-xs text-white"
                  >
                    Guardar
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
  actionButtonShadow: {},
});

