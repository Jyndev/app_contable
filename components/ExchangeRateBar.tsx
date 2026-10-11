import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useExchangeRateStore } from '@/store/exchangeRateStore';
import { formatFriendlyDate } from '@/utils/currency';

export function ExchangeRateBar() {
  const {
    rate,
    lastUpdated,
    source,
    isManual,
    isLoading,
    error,
    setManualRate,
    resetToBcv,
    fetchBcvRate,
  } = useExchangeRateStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [inputRate, setInputRate] = useState('');
  const [syncing, setSyncing] = useState(false);

  const openModal = () => {
    setInputRate(rate > 1 ? rate.toString() : '');
    setModalVisible(true);
  };

  const handleSaveManual = () => {
    const parsed = parseFloat(inputRate.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) {
      Alert.alert('Valor Inválido', 'Por favor ingresa una tasa de cambio numérica mayor a 0.');
      return;
    }
    setManualRate(parsed);
    setModalVisible(false);
  };

  const handleSyncBcv = async () => {
    try {
      setSyncing(true);
      const res = await resetToBcv();
      if (res) {
        Alert.alert('Tasa Actualizada', `Tasa oficial BCV sincronizada con éxito: Bs. ${res.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`);
        setModalVisible(false);
      } else {
        Alert.alert('Aviso', 'No se pudo obtener la tasa en línea. Puedes ingresar una tasa manual.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Error al sincronizar con el BCV');
    } finally {
      setSyncing(false);
    }
  };

  const handleQuickRefresh = async () => {
    try {
      setSyncing(true);
      await fetchBcvRate(true);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Tarjeta Principal Estilo EasyPay */}
      <View style={styles.cardShadow}>
        <LinearGradient
          colors={['#8465e9', '#6845cb', '#542fb8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientCard}
        >
          {/* Fila Superior: Badge y Botón de Ajuste */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center bg-white/20 px-3 py-1 rounded-full">
              <Ionicons
                name={isManual ? 'options-outline' : 'globe-outline'}
                size={13}
                color="#ffffff"
              />
              <Text className="text-white text-[11px] font-bold ml-1.5 uppercase tracking-wider">
                {isManual ? 'Tasa Manual' : 'Tasa Oficial BCV'}
              </Text>
            </View>

            <View className="flex-row items-center gap-1.5">
              <TouchableOpacity
                onPress={handleQuickRefresh}
                disabled={syncing || isLoading}
                activeOpacity={0.7}
                className="w-8 h-8 rounded-full bg-white/15 items-center justify-center"
              >
                {syncing || isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="refresh-outline" size={16} color="#ffffff" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={openModal}
                activeOpacity={0.8}
                className="bg-white/20 active:bg-white/30 px-3 py-1.5 rounded-full flex-row items-center"
              >
                <Ionicons name="pencil-outline" size={13} color="#ffffff" />
                <Text className="text-white text-xs font-semibold ml-1">Ajustar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Valor Central de la Métrica */}
          <View className="my-1">
            <Text className="text-white/80 text-xs font-medium uppercase tracking-wider">
              1 Dólar Estadounidense (USD)
            </Text>
            <View className="flex-row items-baseline mt-1">
              <Text className="text-white text-3xl font-extrabold tracking-tight">
                Bs. {rate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          {/* Fila Inferior: Fecha de actualización o aviso */}
          <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-white/15">
            <View className="flex-row items-center flex-1 mr-2">
              <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.7)" />
              <Text className="text-white/70 text-[10.5px] font-normal ml-1" numberOfLines={1}>
                {lastUpdated
                  ? `Actualizado: ${formatFriendlyDate(lastUpdated)}`
                  : 'Sincronizando tasa con BCV...'}
              </Text>
            </View>

            {isManual && (
              <TouchableOpacity onPress={handleSyncBcv} className="flex-row items-center">
                <Text className="text-white/90 text-[10.5px] font-bold underline">
                  Volver a BCV
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>

      {/* Modal para editar la tasa */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-5">
          <View className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-sm border border-zinc-100 dark:border-zinc-800">
            {/* Header Modal */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <View className="w-8 h-8 rounded-full bg-[#7859d9]/15 items-center justify-center">
                  <Ionicons name="calculator-outline" size={18} color="#7859d9" />
                </View>
                <Text className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Ajustar Tasa de Cambio
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <Ionicons name="close-outline" size={18} color="#8a8a8e" />
              </TouchableOpacity>
            </View>

            <Text className="text-xs text-[#8a8a8e] mb-3 leading-4 font-normal">
              Sobrescribe manualmente la tasa si prefieres usar una cotización paralela o si la API no está disponible:
            </Text>

            {/* Input */}
            <View className="flex-row items-center bg-[#f5f5f7] dark:bg-zinc-800 rounded-2xl px-4 py-3 mb-4 border border-zinc-200 dark:border-zinc-700">
              <Text className="text-sm font-bold text-[#7859d9] mr-2">Bs.</Text>
              <TextInput
                value={inputRate}
                onChangeText={setInputRate}
                keyboardType="decimal-pad"
                placeholder="Ej. 850.50"
                placeholderTextColor="#aeaeaf"
                className="flex-1 text-base font-bold text-zinc-900 dark:text-zinc-100"
                autoFocus
              />
            </View>

            {/* Botón Sincronizar BCV */}
            <TouchableOpacity
              onPress={handleSyncBcv}
              disabled={syncing}
              className="py-2.5 px-3 bg-[#7859d9]/10 rounded-xl flex-row items-center justify-center mb-4 border border-[#7859d9]/20"
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#7859d9" />
              ) : (
                <>
                  <Ionicons name="cloud-download-outline" size={16} color="#7859d9" />
                  <Text className="text-[#7859d9] text-xs font-bold ml-1.5">
                    Consultar y Usar Tasa BCV Oficial
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Acciones del Modal */}
            <View className="flex-row gap-2.5">
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl items-center"
              >
                <Text className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveManual}
                className="flex-1 py-3 bg-[#7859d9] active:bg-[#6845cb] rounded-2xl items-center"
              >
                <Text className="text-xs font-bold text-white">Guardar Tasa</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  cardShadow: {
    borderRadius: 26,
  },
  gradientCard: {
    borderRadius: 26,
    padding: 20,
  },
});
