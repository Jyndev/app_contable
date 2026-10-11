import React, { useState, useMemo } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardBottomInset } from '@/hooks/useKeyboardBottomInset';
import { Ionicons } from '@expo/vector-icons';
import { useGastos } from '@/hooks/useGastos';
import { ExpenseForm } from '@/components/ExpenseForm';
import { ExpenseCard } from '@/components/ExpenseCard';
import { ExpenseSummary } from '@/components/ExpenseSummary';
import { ExpenseDateFilterModal } from '@/components/ExpenseDateFilterModal';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { AppText } from '@/components/AppText';
import { sumCents, formatUsd, formatBs } from '@/utils/currency';
import { Gasto } from '@/database/types';

type FilterPreset = 'TODOS' | 'ESTE_MES' | 'MES_ANTERIOR' | 'ULTIMOS_7' | 'CUSTOM';

export default function GastosScreen() {
  const insets = useSafeAreaInsets();
  const { bottomInset, isKeyboardVisible } = useKeyboardBottomInset(insets.bottom);
  const {
    gastos,
    loading,
    fetchGastos,
    insertGasto,
    updateGasto,
    deleteGasto,
    totalMesBs,
    totalMesUsd,
    cantidadMes,
    totalGeneralBs,
    totalGeneralUsd,
    cantidadGeneral,
  } = useGastos();

  const [showForm, setShowForm] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [filterPreset, setFilterPreset] = useState<FilterPreset>('TODOS');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [dateFilterModalVisible, setDateFilterModalVisible] = useState(false);

  // Helper para rangos predefinidos
  const { dateRangeStart, dateRangeEnd } = useMemo(() => {
    const now = new Date();
    const format = (d: Date) => d.toISOString().split('T')[0];

    if (filterPreset === 'ESTE_MES') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${month}-01`;
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      return { dateRangeStart: start, dateRangeEnd: end };
    }

    if (filterPreset === 'MES_ANTERIOR') {
      const past = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = past.getFullYear();
      const month = String(past.getMonth() + 1).padStart(2, '0');
      const start = `${year}-${month}-01`;
      const lastDay = new Date(year, past.getMonth() + 1, 0).getDate();
      const end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
      return { dateRangeStart: start, dateRangeEnd: end };
    }

    if (filterPreset === 'ULTIMOS_7') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      return { dateRangeStart: format(past), dateRangeEnd: format(now) };
    }

    if (filterPreset === 'CUSTOM') {
      return { dateRangeStart: customStartDate, dateRangeEnd: customEndDate };
    }

    return { dateRangeStart: '', dateRangeEnd: '' };
  }, [filterPreset, customStartDate, customEndDate]);

  // Lista de gastos filtrada por rango de fecha
  const filteredGastos = useMemo(() => {
    if (!dateRangeStart && !dateRangeEnd) return gastos;

    return gastos.filter((g) => {
      if (!g.fecha_gasto) return false;
      const gastoDate = g.fecha_gasto.split('T')[0];
      if (dateRangeStart && gastoDate < dateRangeStart) return false;
      if (dateRangeEnd && gastoDate > dateRangeEnd) return false;
      return true;
    });
  }, [gastos, dateRangeStart, dateRangeEnd]);

  // Totales filtrados
  const filteredTotalBs = useMemo(() => sumCents(filteredGastos.map((g) => g.monto_bs)), [filteredGastos]);
  const filteredTotalUsd = useMemo(() => sumCents(filteredGastos.map((g) => g.monto_usd)), [filteredGastos]);

  const isFilterActive = filterPreset !== 'TODOS';

  const handleSelectPreset = (preset: FilterPreset) => {
    if (preset === 'CUSTOM') {
      setDateFilterModalVisible(true);
    } else {
      setFilterPreset(preset);
    }
  };

  const handleApplyCustomDate = (start: string, end: string) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    if (start || end) {
      setFilterPreset('CUSTOM');
    } else {
      setFilterPreset('TODOS');
    }
  };

  const handleResetFilter = () => {
    setFilterPreset('TODOS');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F6F7FB] dark:bg-[#121214]" edges={['top']}>
      <BackgroundDecorations />
      <FlatList
        data={filteredGastos}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchGastos}
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
                Control de Gastos
              </AppText>
              <ThemeToggleButton />
            </View>

            {/* Widgets de Estadísticas (Mes y General en USD y BS) */}
            <ExpenseSummary
              totalMesBs={totalMesBs}
              totalMesUsd={totalMesUsd}
              cantidadMes={cantidadMes}
              totalGeneralBs={totalGeneralBs}
              totalGeneralUsd={totalGeneralUsd}
              cantidadGeneral={cantidadGeneral}
            />

            {/* Barra de Filtros por Rango de Fecha */}
            <View className="mb-3">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="-mx-1 px-1 mb-2"
              >
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleSelectPreset('TODOS')}
                    className={`px-3.5 py-1.5 rounded-xl ${
                      filterPreset === 'TODOS'
                        ? 'bg-[#7859d9]'
                        : 'bg-white dark:bg-zinc-800'
                    }`}
                  >
                    <AppText
                      weight={filterPreset === 'TODOS' ? 'bold' : 'medium'}
                      className={`text-xs ${
                        filterPreset === 'TODOS' ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Todos
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSelectPreset('ESTE_MES')}
                    className={`px-3.5 py-1.5 rounded-xl ${
                      filterPreset === 'ESTE_MES'
                        ? 'bg-[#7859d9]'
                        : 'bg-white dark:bg-zinc-800'
                    }`}
                  >
                    <AppText
                      weight={filterPreset === 'ESTE_MES' ? 'bold' : 'medium'}
                      className={`text-xs ${
                        filterPreset === 'ESTE_MES' ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Este Mes
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSelectPreset('MES_ANTERIOR')}
                    className={`px-3.5 py-1.5 rounded-xl ${
                      filterPreset === 'MES_ANTERIOR'
                        ? 'bg-[#7859d9]'
                        : 'bg-white dark:bg-zinc-800'
                    }`}
                  >
                    <AppText
                      weight={filterPreset === 'MES_ANTERIOR' ? 'bold' : 'medium'}
                      className={`text-xs ${
                        filterPreset === 'MES_ANTERIOR' ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Mes Pasado
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSelectPreset('ULTIMOS_7')}
                    className={`px-3.5 py-1.5 rounded-xl ${
                      filterPreset === 'ULTIMOS_7'
                        ? 'bg-[#7859d9]'
                        : 'bg-white dark:bg-zinc-800'
                    }`}
                  >
                    <AppText
                      weight={filterPreset === 'ULTIMOS_7' ? 'bold' : 'medium'}
                      className={`text-xs ${
                        filterPreset === 'ULTIMOS_7' ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      Últimos 7 días
                    </AppText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setDateFilterModalVisible(true)}
                    className={`flex-row items-center px-3.5 py-1.5 rounded-xl ${
                      filterPreset === 'CUSTOM'
                        ? 'bg-[#7859d9]'
                        : 'bg-white dark:bg-zinc-800'
                    }`}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={13}
                      color={filterPreset === 'CUSTOM' ? '#ffffff' : '#7859d9'}
                    />
                    <AppText
                      weight={filterPreset === 'CUSTOM' ? 'bold' : 'medium'}
                      className={`text-xs ml-1.5 ${
                        filterPreset === 'CUSTOM' ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {filterPreset === 'CUSTOM' ? 'Rango Activo' : 'Personalizar'}
                    </AppText>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              {/* Indicador de Filtro Activo */}
              {isFilterActive && (
                <View className="bg-[#ECE7FF] dark:bg-zinc-800/80 rounded-2xl px-3.5 py-2 flex-row items-center justify-between mt-1">
                  <View className="flex-1 mr-2">
                    <AppText weight="bold" className="text-xs text-[#7859d9]">
                      Filtro: {filteredGastos.length} gastos ({formatUsd(filteredTotalUsd)} ≈ {formatBs(filteredTotalBs)})
                    </AppText>
                    <AppText weight="medium" className="text-[10px] text-[#7859d9]/80">
                      {dateRangeStart ? dateRangeStart : 'Inicio'} → {dateRangeEnd ? dateRangeEnd : 'Actualidad'}
                    </AppText>
                  </View>
                  <TouchableOpacity
                    onPress={handleResetFilter}
                    className="p-1 rounded-lg bg-white dark:bg-zinc-700"
                  >
                    <Ionicons name="close-circle" size={16} color="#7859d9" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Fila de Título y Botón Nuevo Gasto */}
            <View className="flex-row justify-between items-center mb-3 mt-1">
              <AppText
                weight="bold"
                className="text-base text-[#1a1a1a] dark:text-zinc-100"
              >
                Historial de Gastos
              </AppText>

              <TouchableOpacity
                onPress={() => setShowForm((prev) => !prev)}
                className={`flex-row items-center px-3.5 py-2 rounded-xl ${
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
                  {showForm ? 'Ocultar' : 'Nuevo Gasto'}
                </AppText>
              </TouchableOpacity>
            </View>

            {/* Formulario de Nuevo Gasto */}
            {showForm && (
              <View className="mb-5">
                <ExpenseForm
                  onSubmit={async (data) => {
                    const id = await insertGasto(data);
                    setShowForm(false);
                    return id;
                  }}
                  onClose={() => setShowForm(false)}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ExpenseCard gasto={item} onEdit={(g) => setEditingGasto(g)} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-10 px-6 bg-white dark:bg-zinc-900 rounded-3xl mt-2">
              <View className="w-14 h-14 rounded-full bg-[#ECE7FF] items-center justify-center mb-3">
                <Ionicons
                  name={isFilterActive ? 'search-outline' : 'receipt-outline'}
                  size={26}
                  color="#7859d9"
                />
              </View>
              <AppText
                weight="bold"
                className="text-base text-zinc-800 dark:text-zinc-200 text-center"
              >
                {isFilterActive
                  ? 'No hay gastos en este rango de fechas'
                  : 'No hay gastos registrados'}
              </AppText>
              <AppText
                weight="medium"
                className="text-xs text-[#8a8a8e] text-center mt-1 mb-4"
              >
                {isFilterActive
                  ? 'Intenta seleccionando otro período o restablece el filtro.'
                  : 'Presiona "Nuevo Gasto" para registrar tu primer egreso en USD o Bs.'}
              </AppText>
              {isFilterActive ? (
                <TouchableOpacity
                  onPress={handleResetFilter}
                  className="bg-[#7859d9] px-4 py-2.5 rounded-xl flex-row items-center"
                >
                  <Ionicons name="refresh-outline" size={16} color="#ffffff" />
                  <AppText weight="bold" className="text-white text-xs ml-1.5">
                    Restablecer Filtro
                  </AppText>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowForm(true)}
                  className="bg-[#7859d9] px-4 py-2.5 rounded-xl flex-row items-center"
                >
                  <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
                  <AppText weight="bold" className="text-white text-xs ml-1.5">
                    Agregar Gasto
                  </AppText>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7859d9" />
            </View>
          )
        }
      />

      {/* Modal para Editar Gasto */}
      {editingGasto && (
        <Modal
          visible={!!editingGasto}
          transparent
          animationType="slide"
          statusBarTranslucent
          onRequestClose={() => setEditingGasto(null)}
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
                <ExpenseForm
                  initialGasto={editingGasto}
                  onSubmit={async (data) => {
                    await updateGasto(editingGasto.id, data);
                    setEditingGasto(null);
                  }}
                  onClose={() => setEditingGasto(null)}
                />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Modal para selección de rango personalizado */}
      <ExpenseDateFilterModal
        visible={dateFilterModalVisible}
        startDate={customStartDate}
        endDate={customEndDate}
        onApply={handleApplyCustomDate}
        onClose={() => setDateFilterModalVisible(false)}
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
});
