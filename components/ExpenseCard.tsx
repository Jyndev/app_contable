import React, { useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gasto } from '@/database/types';
import { formatBs, formatUsd, formatFriendlyDate } from '@/utils/currency';
import { AppText } from '@/components/AppText';
import { ConfirmModal } from '@/components/ConfirmModal';

interface ExpenseCardProps {
  gasto: Gasto;
  onEdit: (gasto: Gasto) => void;
}

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

export function ExpenseCard({ gasto, onEdit }: ExpenseCardProps) {
  const iconName = CATEGORY_ICONS[gasto.categoria] || 'pricetag';

  return (
    <View className="bg-white dark:bg-zinc-900 rounded-2xl p-4 mb-3">
      <View className="flex-row items-center justify-between">
        {/* Categoría y Fecha */}
        <View className="flex-row items-center space-x-3 flex-1 mr-2">
          <View className="w-11 h-11 rounded-2xl bg-[#ECE7FF] dark:bg-zinc-800 items-center justify-center">
            <Ionicons name={iconName} size={20} color="#7859d9" />
          </View>
          <View className="flex-1 ml-2">
            <AppText
              weight="bold"
              className="text-base text-zinc-900 dark:text-zinc-100"
              numberOfLines={1}
            >
              {gasto.categoria}
            </AppText>
            {!!gasto.descripcion && (
              <AppText
                weight="medium"
                className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5"
                numberOfLines={2}
              >
                {gasto.descripcion}
              </AppText>
            )}
            <AppText
              weight="medium"
              className="text-[11px] text-[#8a8a8e] mt-0.5"
            >
              {formatFriendlyDate(gasto.fecha_gasto)}
            </AppText>
          </View>
        </View>

        {/* Montos y botón editar */}
        <View className="items-end shrink-0 max-w-[45%]">
          <AppText
            weight="extrabold"
            className="text-base text-rose-600 dark:text-rose-400"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            - {formatBs(gasto.monto_bs)}
          </AppText>
          <AppText
            weight="semibold"
            className="text-xs text-zinc-600 dark:text-zinc-400"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            ≈ {formatUsd(gasto.monto_usd)}
          </AppText>
          <AppText
            weight="regular"
            className="text-[10px] text-[#aeaeaf]"
            numberOfLines={1}
          >
            Tasa: Bs. {gasto.tasa_cambio}
          </AppText>
        </View>

        <TouchableOpacity
          onPress={() => onEdit(gasto)}
          className="ml-2.5 p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 active:bg-[#ECE7FF] dark:active:bg-zinc-700 shrink-0"
        >
          <Ionicons name="create-outline" size={16} color="#7859d9" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
