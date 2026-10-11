import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useProveedores } from '@/hooks/useProveedores';
import { ProviderPaymentsCard } from '@/components/ProviderPaymentsCard';
import { ProviderPaymentForm } from '@/components/ProviderPaymentForm';
import { ProviderPaymentCard } from '@/components/ProviderPaymentCard';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { BackgroundDecorations } from '@/components/BackgroundDecorations';
import { AppText } from '@/components/AppText';
import { formatMonthYearSpanish } from '@/components/MonthlyPaymentsCard';

import { ProviderReportModal } from '@/components/ProviderReportModal';

export default function ProveedoresScreen() {
  const {
    pagosProveedores,
    proveedoresList,
    totalMesUsd,
    totalMesBs,
    cantidadMes,
    selectedDate,
    isCurrentMonth,
    loading,
    changeMonth,
    resetToCurrentMonth,
    fetchPagosProveedores,
    insertPagoProveedor,
    deletePagoProveedor,
  } = useProveedores();

  const [modalFormVisible, setModalFormVisible] = useState(false);
  const [inlineFormVisible, setInlineFormVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);

  const monthLabel = formatMonthYearSpanish(selectedDate);

  return (
    <SafeAreaView className="flex-1 bg-[#F6F7FB] dark:bg-[#121214]" edges={['top']}>
      <BackgroundDecorations />
      <FlatList
        data={pagosProveedores}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchPagosProveedores(true, selectedDate)}
            tintColor="#7859d9"
            colors={['#7859d9']}
          />
        }
        ListHeaderComponent={
          <View>
            {/* Header Bar: Botón de Exportar Imagen, Mes seleccionado y botón de Modo Oscuro */}
            <View className="flex-row items-center justify-between pt-2 pb-2 mb-3">
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setReportModalVisible(true)}
                className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 items-center justify-center border border-zinc-200/60 dark:border-zinc-700/60"
              >
                <Ionicons name="download-outline" size={18} color="#7859d9" />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={isCurrentMonth ? 1 : 0.7}
                onPress={isCurrentMonth ? undefined : resetToCurrentMonth}
                className="items-center"
              >
                <AppText
                  weight="extrabold"
                  className="text-lg text-[#1a1a1a] dark:text-zinc-100 tracking-tight text-center"
                >
                  {monthLabel}
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

            {/* Card Principal de Pagos a Proveedores con Navegación Deslizable */}
            <ProviderPaymentsCard
              selectedDate={selectedDate}
              totalPagosUsd={totalMesUsd}
              totalPagosBs={totalMesBs}
              cantidadPagos={cantidadMes}
              onPrevMonth={() => changeMonth(-1)}
              onNextMonth={() => changeMonth(1)}
              onResetToCurrentMonth={resetToCurrentMonth}
              isCurrentMonth={isCurrentMonth}
            />

            {/* Barra de Título y Botones de Acción */}
            <View className="flex-row justify-between items-center mb-3 mt-2">
              <View className="flex-1 mr-2">
                <AppText
                  weight="bold"
                  className="text-base text-[#1a1a1a] dark:text-zinc-100"
                >
                  Pagos a Proveedores
                </AppText>
                <AppText weight="medium" className="text-[11px] text-[#8a8a8e]">
                  Asignados a {monthLabel}
                </AppText>
              </View>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={() => setReportModalVisible(true)}
                  className="p-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200/60 dark:border-zinc-700/60 items-center justify-center"
                >
                  <Ionicons name="image-outline" size={16} color="#7859d9" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setInlineFormVisible((prev) => !prev)}
                  className={`flex-row items-center px-3.5 py-2 rounded-xl ${
                    inlineFormVisible ? 'bg-zinc-200 dark:bg-zinc-800' : 'bg-[#7859d9]'
                  }`}
                >
                  <Ionicons
                    name={inlineFormVisible ? 'chevron-up-outline' : 'add-outline'}
                    size={16}
                    color={inlineFormVisible ? '#3f3f46' : '#ffffff'}
                  />
                  <AppText
                    weight="bold"
                    className={`text-xs ml-1 ${
                      inlineFormVisible ? 'text-zinc-700 dark:text-zinc-300' : 'text-white'
                    }`}
                  >
                    {inlineFormVisible ? 'Cerrar' : 'Nuevo Pago'}
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Formulario Inline */}
            {inlineFormVisible && (
              <View className="mb-5">
                <ProviderPaymentForm
                  initialAssignedDate={selectedDate}
                  knownProviders={proveedoresList}
                  onSubmit={async (data) => {
                    const id = await insertPagoProveedor(data);
                    setInlineFormVisible(false);
                    return id;
                  }}
                  onClose={() => setInlineFormVisible(false)}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <ProviderPaymentCard pago={item} onDelete={deletePagoProveedor} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View className="items-center justify-center py-12 px-6 bg-white dark:bg-zinc-900 rounded-3xl mt-2">
              <View className="w-16 h-16 rounded-full bg-[#ECE7FF] items-center justify-center mb-3">
                <Ionicons name="business-outline" size={30} color="#7859d9" />
              </View>
              <AppText
                weight="bold"
                className="text-base text-zinc-800 dark:text-zinc-200 text-center"
              >
                Sin pagos a proveedores en {monthLabel}
              </AppText>
              <AppText
                weight="medium"
                className="text-xs text-[#8a8a8e] text-center mt-1 mb-5"
              >
                Registra tus abonos y compras a proveedores asignándolos a este u otros meses.
              </AppText>
              <TouchableOpacity
                onPress={() => setInlineFormVisible(true)}
                className="bg-[#7859d9] px-4 py-2.5 rounded-xl flex-row items-center"
              >
                <Ionicons name="add-circle-outline" size={16} color="#ffffff" />
                <AppText weight="bold" className="text-white text-xs ml-1.5">
                  Registrar Pago a Proveedor
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#7859d9" />
            </View>
          )
        }
      />

      {/* Modal de Reporte / Descarga de Imagen */}
      {reportModalVisible && (
        <ProviderReportModal
          visible={reportModalVisible}
          selectedDate={selectedDate}
          pagos={pagosProveedores}
          totalUsd={totalMesUsd}
          totalBs={totalMesBs}
          cantidadPagos={cantidadMes}
          onClose={() => setReportModalVisible(false)}
        />
      )}
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
