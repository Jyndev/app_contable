import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { PagoProveedor } from '@/database/types';
import { formatBs, formatUsd } from '@/utils/currency';
import { AppText } from '@/components/AppText';
import { formatMonthYearSpanish } from '@/components/MonthlyPaymentsCard';

interface ProviderReportModalProps {
  visible: boolean;
  selectedDate: Date;
  pagos: PagoProveedor[];
  totalUsd: number;
  totalBs: number;
  cantidadPagos: number;
  onClose: () => void;
}

export function ProviderReportModal({
  visible,
  selectedDate,
  pagos,
  totalUsd,
  totalBs,
  cantidadPagos,
  onClose,
}: ProviderReportModalProps) {
  const viewShotRef = useRef<any>(null);
  const [capturing, setCapturing] = useState(false);

  if (!visible) return null;

  const monthLabel = formatMonthYearSpanish(selectedDate);
  const nowFormatted = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handleExportImage = async () => {
    try {
      if (!viewShotRef.current) return;
      setCapturing(true);

      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Reporte Proveedores - ${monthLabel}`,
          UTI: 'public.png',
        });
      } else {
        Alert.alert('Reporte generado', `Imagen lista en: ${uri}`);
      }
    } catch (err: any) {
      console.error('Error capturing image:', err);
      Alert.alert('Error al exportar', err?.message || 'No se pudo generar la imagen del reporte.');
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View className="bg-[#F6F7FB] dark:bg-zinc-900 rounded-t-[32px] p-5 w-full max-h-[92%]">
          {/* Header del Modal */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 rounded-lg bg-[#ECE7FF] items-center justify-center">
                <Ionicons name="image-outline" size={18} color="#7859d9" />
              </View>
              <View>
                <AppText weight="bold" className="text-base text-zinc-900 dark:text-zinc-100">
                  Exportar Reporte de Proveedores
                </AppText>
                <AppText weight="medium" className="text-xs text-[#8a8a8e]">
                  Mes Asignado: {monthLabel}
                </AppText>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close-circle-outline" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Vista Previa Desplazable del Reporte a Capturar */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16 }}
          >
            {/* Contenedor que será capturado como Imagen */}
            <ViewShot
              ref={viewShotRef}
              options={{ format: 'png', quality: 1 }}
              style={styles.captureContainer}
            >
              <View className="bg-[#F8F9FD] p-5 rounded-3xl border border-zinc-200/70 overflow-hidden relative">
                {/* Decoraciones de Fondo Idénticas a la App */}
                <View style={StyleSheet.absoluteFill} pointerEvents="none">
                  {/* Cápsula diagonal superior derecha */}
                  <View style={styles.pillTopRight} />
                  <View style={styles.pillTopRightSmall} />
                  {/* Squircle / Rombo redondeado centro-izquierdo */}
                  <View style={styles.squircleCenterLeft} />
                  <View style={styles.squircleCenterLeftRing} />
                  {/* Barra diagonal inferior derecha */}
                  <View style={styles.pillBottomRight} />
                  {/* Mini pastilla superior izquierda */}
                  <View style={styles.capsuleTopLeft} />
                </View>

                {/* 1. Encabezado Institucional del Reporte */}
                <View className="flex-row justify-between items-start mb-4 pb-3 border-b border-zinc-200/60 z-10">
                  <View>
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <View className="w-6 h-6 rounded-md bg-[#7859d9] items-center justify-center">
                        <Ionicons name="wallet" size={13} color="#ffffff" />
                      </View>
                      <AppText weight="extrabold" className="text-sm text-[#7859d9] tracking-wider">
                        EASYPAY
                      </AppText>
                    </View>
                    <AppText weight="bold" className="text-lg text-[#1a1a1a]">
                      Reporte de Pagos a Proveedores
                    </AppText>
                    <AppText weight="medium" className="text-xs text-[#8a8a8e]">
                      Mes Asignado: {monthLabel}
                    </AppText>
                  </View>

                  <View className="items-end bg-white/90 px-3 py-1.5 rounded-xl border border-zinc-200/70 shadow-sm">
                    <AppText weight="medium" className="text-[10px] text-[#aeaeaf]">
                      Fecha de emisión
                    </AppText>
                    <AppText weight="bold" className="text-xs text-[#1a1a1a]">
                      {nowFormatted}
                    </AppText>
                  </View>
                </View>

                {/* 2. Card Principal de Totales con amplio padding y bordes redondeados */}
                <LinearGradient
                  colors={['#8b6dfc', '#7451ec', '#562ecc']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.totalsCardGradient}
                >
                  {/* Ondas decorativas internas de la card */}
                  <View style={styles.cardWaveOverlay1} />
                  <View style={styles.cardWaveOverlay2} />

                  <View style={styles.cardTopRow}>
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center">
                        <Ionicons name="business-outline" size={15} color="#ffffff" />
                      </View>
                      <AppText weight="bold" className="text-white/95 text-xs uppercase tracking-wider">
                        Total Pagos Asignados
                      </AppText>
                    </View>

                    <View className="bg-white/20 px-3 py-1 rounded-full">
                      <AppText weight="bold" className="text-white text-xs">
                        {cantidadPagos} {cantidadPagos === 1 ? 'pago' : 'pagos'}
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.cardAmountsContainer}>
                    <AppText weight="medium" className="text-white/75 text-[11px] uppercase tracking-wider mb-0.5">
                      Total Imputado a {monthLabel}
                    </AppText>
                    <AppText weight="extrabold" className="text-4xl text-white tracking-tight leading-10">
                      {formatUsd(totalUsd)}
                    </AppText>
                    <AppText weight="bold" className="text-base text-white/90 mt-1">
                      ≈ {formatBs(totalBs)}
                    </AppText>
                  </View>
                </LinearGradient>

                {/* 3. Tabla / Listado de Pagos Asignados */}
                <View className="bg-white/95 rounded-2xl p-4 border border-zinc-200/60 mb-2 z-10 shadow-sm">
                  <View className="flex-row justify-between items-center mb-2 pb-2 border-b border-zinc-100">
                    <AppText weight="bold" className="text-xs text-[#1a1a1a] uppercase tracking-wider">
                      Detalle de Pagos ({pagos.length})
                    </AppText>
                    <AppText weight="medium" className="text-[10px] text-[#8a8a8e]">
                      Fecha de Pago / Montos
                    </AppText>
                  </View>

                  {pagos.length === 0 ? (
                    <View className="py-6 items-center justify-center">
                      <AppText weight="medium" className="text-xs text-[#8a8a8e]">
                        No hay pagos a proveedores registrados para este mes.
                      </AppText>
                    </View>
                  ) : (
                    pagos.map((p, index) => {
                      const fechaFormatted = p.fecha_pago
                        ? p.fecha_pago.split('T')[0]
                        : 'N/A';
                      return (
                        <View
                          key={p.id}
                          className={`py-2.5 flex-row justify-between items-center ${
                            index < pagos.length - 1 ? 'border-b border-zinc-100' : ''
                          }`}
                        >
                          <View className="flex-1 mr-2">
                            <View className="flex-row items-center gap-1.5">
                              <AppText weight="bold" className="text-sm text-[#1a1a1a]">
                                {p.proveedor}
                              </AppText>
                            </View>
                            {p.descripcion ? (
                              <AppText
                                weight="medium"
                                className="text-[11px] text-[#8a8a8e] mt-0.5"
                                numberOfLines={1}
                              >
                                {p.descripcion}
                              </AppText>
                            ) : null}
                            <AppText weight="regular" className="text-[10px] text-[#aeaeaf] mt-0.5">
                              Pagado el: {fechaFormatted}
                            </AppText>
                          </View>

                          <View className="items-end">
                            <AppText weight="bold" className="text-sm text-[#1a1a1a]">
                              {formatUsd(p.monto_usd)}
                            </AppText>
                            <AppText weight="semibold" className="text-[11px] text-[#8a8a8e]">
                              {formatBs(p.monto_bs)}
                            </AppText>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>

                {/* 4. Footer del Reporte */}
                <View className="pt-2 mt-2 border-t border-zinc-200/60 flex-row justify-between items-center z-10">
                  <AppText weight="medium" className="text-[10px] text-[#aeaeaf]">
                    EasyPay • Resumen Contable Oficial
                  </AppText>
                  <AppText weight="bold" className="text-[11px] text-[#7859d9]">
                    Total: {formatUsd(totalUsd)}
                  </AppText>
                </View>
              </View>
            </ViewShot>
          </ScrollView>

          {/* Botón de Acción Principal: Descargar / Compartir Imagen */}
          <View className="flex-row gap-3 pt-2">
            <TouchableOpacity
              onPress={onClose}
              className="py-3.5 px-5 bg-zinc-200 dark:bg-zinc-800 rounded-2xl items-center justify-center"
            >
              <AppText weight="semibold" className="text-xs text-zinc-700 dark:text-zinc-300">
                Cerrar
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExportImage}
              disabled={capturing}
              className="flex-1 py-3.5 bg-[#7859d9] active:bg-[#6845cb] rounded-2xl flex-row items-center justify-center"
            >
              {capturing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={18} color="#ffffff" />
                  <AppText weight="bold" className="text-white text-xs ml-1.5">
                    Descargar / Compartir Imagen
                  </AppText>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  captureContainer: {
    backgroundColor: '#F8F9FD',
    borderRadius: 32,
    overflow: 'hidden',
  },
  totalsCardGradient: {
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 20,
    marginVertical: 14,
    minHeight: 160,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#7859d9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    zIndex: 10,
  },
  cardAmountsContainer: {
    marginVertical: 4,
    zIndex: 10,
  },
  cardWaveOverlay1: {
    position: 'absolute',
    top: -45,
    right: -35,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  cardWaveOverlay2: {
    position: 'absolute',
    bottom: -55,
    left: -30,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  // Formas de fondo del reporte idénticas a BackgroundDecorations
  pillTopRight: {
    position: 'absolute',
    top: -30,
    right: -50,
    width: 200,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(120, 89, 217, 0.055)',
    transform: [{ rotate: '-35deg' }],
  },
  pillTopRightSmall: {
    position: 'absolute',
    top: 50,
    right: -15,
    width: 120,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(120, 89, 217, 0.035)',
    transform: [{ rotate: '-35deg' }],
  },
  squircleCenterLeft: {
    position: 'absolute',
    top: 260,
    left: -50,
    width: 130,
    height: 130,
    borderRadius: 36,
    backgroundColor: 'rgba(120, 89, 217, 0.055)',
    transform: [{ rotate: '45deg' }],
  },
  squircleCenterLeftRing: {
    position: 'absolute',
    top: 245,
    left: -65,
    width: 160,
    height: 160,
    borderRadius: 46,
    borderColor: 'rgba(120, 89, 217, 0.06)',
    borderWidth: 1.5,
    transform: [{ rotate: '45deg' }],
  },
  pillBottomRight: {
    position: 'absolute',
    bottom: 30,
    right: -60,
    width: 220,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(120, 89, 217, 0.055)',
    transform: [{ rotate: '25deg' }],
  },
  capsuleTopLeft: {
    position: 'absolute',
    top: 70,
    left: -25,
    width: 80,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(120, 89, 217, 0.035)',
    transform: [{ rotate: '20deg' }],
  },
});
