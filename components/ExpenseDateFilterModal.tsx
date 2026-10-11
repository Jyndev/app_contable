import React, { useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  Alert,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { typography } from '@/constants/Typography';

interface ExpenseDateFilterModalProps {
  visible: boolean;
  startDate: string;
  endDate: string;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
}

export function ExpenseDateFilterModal({
  visible,
  startDate,
  endDate,
  onApply,
  onClose,
}: ExpenseDateFilterModalProps) {
  const [start, setStart] = useState(startDate || '');
  const [end, setEnd] = useState(endDate || '');

  const handleApply = () => {
    // Validar formato simple YYYY-MM-DD si se ingresa
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (start && !dateRegex.test(start)) {
      Alert.alert('Fecha inválida', 'La fecha inicial debe tener el formato AAAA-MM-DD (ej. 2026-09-01)');
      return;
    }
    if (end && !dateRegex.test(end)) {
      Alert.alert('Fecha inválida', 'La fecha final debe tener el formato AAAA-MM-DD (ej. 2026-09-30)');
      return;
    }
    if (start && end && start > end) {
      Alert.alert('Rango inválido', 'La fecha inicial no puede ser posterior a la fecha final.');
      return;
    }

    onApply(start, end);
    onClose();
  };

  const setQuickRange = (daysAgo: number) => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - daysAgo);

    const format = (d: Date) => d.toISOString().split('T')[0];
    setStart(format(past));
    setEnd(format(now));
  };

  const setThisMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const startStr = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const endStr = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    setStart(startStr);
    setEnd(endStr);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View className="flex-1 justify-center items-center bg-black/60 px-5">
            <TouchableWithoutFeedback>
            <View
              style={styles.modalCard}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800"
            >
              {/* Header */}
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center gap-2">
                  <View className="w-8 h-8 rounded-full bg-[#ECE7FF] dark:bg-zinc-800 items-center justify-center">
                    <Ionicons name="calendar-outline" size={18} color="#7859d9" />
                  </View>
                  <AppText
                    weight="extrabold"
                    className="text-base text-zinc-900 dark:text-zinc-100"
                  >
                    Filtrar por Fechas
                  </AppText>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
                >
                  <Ionicons name="close-outline" size={18} color="#8a8a8e" />
                </TouchableOpacity>
              </View>

              {/* Atajos Rápidos */}
              <AppText
                weight="semibold"
                className="text-[11px] text-[#8a8a8e] mb-2 uppercase tracking-wide"
              >
                Accesos Rápidos
              </AppText>
              <View className="flex-row flex-wrap gap-1.5 mb-4">
                <TouchableOpacity
                  onPress={() => setQuickRange(7)}
                  className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700"
                >
                  <AppText weight="medium" className="text-xs text-zinc-700 dark:text-zinc-300">
                    Últimos 7 días
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setQuickRange(30)}
                  className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700"
                >
                  <AppText weight="medium" className="text-xs text-zinc-700 dark:text-zinc-300">
                    Últimos 30 días
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={setThisMonth}
                  className="bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700"
                >
                  <AppText weight="medium" className="text-xs text-zinc-700 dark:text-zinc-300">
                    Mes Actual
                  </AppText>
                </TouchableOpacity>
              </View>

              {/* Input Fecha Desde */}
              <AppText
                weight="semibold"
                className="text-xs text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide"
              >
                Desde (AAAA-MM-DD)
              </AppText>
              <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2.5 mb-3.5 border border-zinc-200 dark:border-zinc-700">
                <Ionicons name="calendar-clear-outline" size={16} color="#7859d9" />
                <TextInput
                  value={start}
                  onChangeText={setStart}
                  placeholder="Ej. 2026-09-01"
                  placeholderTextColor="#aeaeaf"
                  style={typography.medium}
                  className="flex-1 ml-2 text-sm text-zinc-900 dark:text-zinc-100"
                  maxLength={10}
                />
              </View>

              {/* Input Fecha Hasta */}
              <AppText
                weight="semibold"
                className="text-xs text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide"
              >
                Hasta (AAAA-MM-DD)
              </AppText>
              <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-2.5 mb-5 border border-zinc-200 dark:border-zinc-700">
                <Ionicons name="calendar-clear-outline" size={16} color="#7859d9" />
                <TextInput
                  value={end}
                  onChangeText={setEnd}
                  placeholder="Ej. 2026-09-30"
                  placeholderTextColor="#aeaeaf"
                  style={typography.medium}
                  className="flex-1 ml-2 text-sm text-zinc-900 dark:text-zinc-100"
                  maxLength={10}
                />
              </View>

              {/* Botones de Acción */}
              <View className="flex-row gap-2.5">
                <TouchableOpacity
                  onPress={() => {
                    setStart('');
                    setEnd('');
                    onApply('', '');
                    onClose();
                  }}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-2xl items-center justify-center border border-zinc-200 dark:border-zinc-700"
                >
                  <AppText weight="bold" className="text-xs text-zinc-700 dark:text-zinc-300">
                    Limpiar
                  </AppText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleApply}
                  className="flex-1 py-3 bg-[#7859d9] active:bg-[#6845cb] rounded-2xl items-center justify-center"
                >
                  <AppText weight="bold" className="text-xs text-white">
                    Aplicar Filtro
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalCard: {},
});
