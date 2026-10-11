import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary' | 'success';
  icon?: keyof typeof Ionicons.glyphMap;
  singleButton?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  icon,
  singleButton = false,
  loading = false,
  onConfirm,
  onCancel = () => {},
}: ConfirmModalProps) {
  const isDanger = variant === 'danger';
  const isSuccess = variant === 'success';

  const defaultIcon = isDanger
    ? 'trash-outline'
    : isSuccess
    ? 'checkmark-circle-outline'
    : 'help-circle-outline';

  const iconName = icon || defaultIcon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={singleButton ? onConfirm : onCancel}>
        <View className="flex-1 justify-center items-center bg-black/60 px-6">
          <TouchableWithoutFeedback>
            <View
              style={styles.modalCard}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-6 items-center"
            >
              {/* Icono con badge circular */}
              <View
                className={`w-16 h-16 rounded-full items-center justify-center mb-4 ${
                  isDanger
                    ? 'bg-rose-50 dark:bg-rose-950/40'
                    : isSuccess
                    ? 'bg-emerald-50 dark:bg-emerald-950/40'
                    : 'bg-[#ECE7FF] dark:bg-zinc-800'
                }`}
              >
                <Ionicons
                  name={iconName}
                  size={32}
                  color={isDanger ? '#e11d48' : isSuccess ? '#059669' : '#7859d9'}
                />
              </View>

              {/* Título */}
              <AppText
                weight="extrabold"
                className="text-lg text-zinc-900 dark:text-zinc-100 text-center mb-1.5"
              >
                {title}
              </AppText>

              {/* Mensaje */}
              <AppText
                weight="regular"
                className="text-xs text-[#8a8a8e] text-center mb-6 leading-5 px-2"
              >
                {message}
              </AppText>

              {/* Botones de Acción */}
              <View className="flex-row gap-3 w-full">
                {!singleButton && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={onCancel}
                    disabled={loading}
                    className="flex-1 py-3.5 bg-zinc-100 dark:bg-zinc-800 rounded-2xl items-center justify-center"
                  >
                    <AppText
                      weight="bold"
                      className="text-xs text-zinc-700 dark:text-zinc-300"
                    >
                      {cancelText}
                    </AppText>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onConfirm}
                  disabled={loading}
                  className={`flex-1 py-3.5 rounded-2xl items-center justify-center ${
                    isDanger
                      ? 'bg-rose-600 active:bg-rose-700'
                      : isSuccess
                      ? 'bg-emerald-600 active:bg-emerald-700'
                      : 'bg-[#7859d9] active:bg-[#6845cb]'
                  }`}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <AppText weight="bold" className="text-xs text-white">
                      {confirmText}
                    </AppText>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalCard: {},
});
