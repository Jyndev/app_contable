import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PagoProveedor } from '@/database/types';
import { formatUsd, formatBs } from '@/utils/currency';
import { AppText } from '@/components/AppText';
import { ConfirmModal } from '@/components/ConfirmModal';

interface ProviderPaymentCardProps {
  pago: PagoProveedor;
  onDelete: (id: number) => Promise<void>;
}

export function ProviderPaymentCard({ pago, onDelete }: ProviderPaymentCardProps) {
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const formattedUsd = formatUsd(pago.monto_usd);
  const formattedBs = formatBs(pago.monto_bs);

  // Formato de fecha legible
  const formattedDate = (() => {
    try {
      const d = new Date(pago.fecha_pago);
      return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return pago.fecha_pago.split('T')[0];
    }
  })();

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onDelete(pago.id);
      setConfirmDeleteVisible(false);
    } catch (e) {
      console.warn('Error deleting provider payment:', e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-3 flex-row items-center justify-between border border-zinc-100 dark:border-zinc-800">
        {/* Avatar e Información Principal */}
        <View className="flex-row items-center flex-1 mr-3">
          <View className="w-11 h-11 rounded-2xl bg-[#ECE7FF] dark:bg-zinc-800 items-center justify-center mr-3">
            <Ionicons name="business" size={20} color="#7859d9" />
          </View>

          <View className="flex-1">
            <AppText
              weight="bold"
              className="text-sm text-zinc-900 dark:text-zinc-100"
              numberOfLines={1}
            >
              {pago.proveedor}
            </AppText>

            {pago.descripcion ? (
              <AppText
                weight="regular"
                className="text-xs text-[#8a8a8e] mt-0.5"
                numberOfLines={1}
              >
                {pago.descripcion}
              </AppText>
            ) : null}

            <View className="flex-row items-center gap-1.5 mt-1.5 flex-wrap">
              <View className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md flex-row items-center">
                <Ionicons name="calendar-outline" size={10} color="#8a8a8e" />
                <AppText weight="medium" className="text-[10px] text-[#8a8a8e] ml-1">
                  Pagado: {formattedDate}
                </AppText>
              </View>

              <View className="bg-[#ECE7FF] dark:bg-zinc-800 px-2 py-0.5 rounded-md flex-row items-center">
                <Ionicons name="bookmark-outline" size={10} color="#7859d9" />
                <AppText weight="bold" className="text-[10px] text-[#7859d9] ml-1">
                  Asignado: {pago.mes_asignado}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Montos y Botón Eliminar */}
        <View className="items-end">
          <AppText
            weight="extrabold"
            className="text-base text-zinc-900 dark:text-zinc-100"
          >
            {formattedUsd}
          </AppText>
          <AppText
            weight="semibold"
            className="text-xs text-[#8a8a8e]"
          >
            ≈ {formattedBs}
          </AppText>

          <TouchableOpacity
            onPress={() => setConfirmDeleteVisible(true)}
            className="mt-1.5 p-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/80"
          >
            <Ionicons name="trash-outline" size={14} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal de Confirmación para Eliminar */}
      <ConfirmModal
        visible={confirmDeleteVisible}
        title="Eliminar Pago a Proveedor"
        message={`¿Estás seguro de que deseas eliminar el registro de pago a "${pago.proveedor}" por ${formattedUsd}?`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        icon="trash-outline"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteVisible(false)}
      />
    </>
  );
}
