import React, { useState, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useExchangeRateStore } from '@/store/exchangeRateStore';
import {
  toCents,
  fromCents,
  calculateBsFromUsd,
  calculateUsdFromBs,
  formatBs,
  formatUsd,
} from '@/utils/currency';
import { AppText } from '@/components/AppText';
import { typography } from '@/constants/Typography';

export function BcvCalculatorCard() {
  const { rate } = useExchangeRateStore();
  const [direction, setDirection] = useState<'USD_TO_BS' | 'BS_TO_USD'>('USD_TO_BS');
  const [amountStr, setAmountStr] = useState<string>('1');
  const [copied, setCopied] = useState<boolean>(false);

  const effectiveRate = rate > 0 ? rate : 1;
  const inputCents = useMemo(() => toCents(amountStr), [amountStr]);

  const { resultFormatted, rawResultStr, calculationDetail } = useMemo(() => {
    if (inputCents <= 0) {
      return {
        resultFormatted: direction === 'USD_TO_BS' ? 'Bs. 0,00' : '$0.00',
        rawResultStr: '0.00',
        calculationDetail: `0 × Bs. ${effectiveRate}`,
      };
    }

    if (direction === 'USD_TO_BS') {
      const bsCents = calculateBsFromUsd(inputCents, effectiveRate);
      const bsRaw = fromCents(bsCents).toFixed(2);
      return {
        resultFormatted: formatBs(bsCents),
        rawResultStr: bsRaw,
        calculationDetail: `$${fromCents(inputCents)} × Bs. ${effectiveRate}`,
      };
    } else {
      const usdCents = calculateUsdFromBs(inputCents, effectiveRate);
      const usdRaw = fromCents(usdCents).toFixed(2);
      return {
        resultFormatted: formatUsd(usdCents),
        rawResultStr: usdRaw,
        calculationDetail: `Bs. ${fromCents(inputCents)} ÷ ${effectiveRate}`,
      };
    }
  }, [inputCents, direction, effectiveRate]);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(resultFormatted);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (e) {
      console.warn('Error copying to clipboard:', e);
    }
  };

  const handleToggleDirection = () => {
    setDirection((prev) => (prev === 'USD_TO_BS' ? 'BS_TO_USD' : 'USD_TO_BS'));
    setCopied(false);
  };

  const setQuickAmount = (val: string) => {
    setAmountStr(val);
    setCopied(false);
  };

  const isUsdToBs = direction === 'USD_TO_BS';

  return (
    <View className="bg-white dark:bg-zinc-900 rounded-3xl p-5 mb-6 border border-zinc-100 dark:border-zinc-800">
      {/* Header: Título y Tasa BCV */}
      <View className="flex-row justify-between items-center mb-4">
        <View className="flex-row items-center gap-2">
          <View className="w-8 h-8 rounded-lg bg-[#ECE7FF] dark:bg-zinc-800 items-center justify-center">
            <Ionicons name="calculator-outline" size={18} color="#7859d9" />
          </View>
          <AppText
            weight="bold"
            className="text-base text-[#1a1a1a] dark:text-zinc-100"
          >
            Calculadora Dólar BCV
          </AppText>
        </View>

        <View className="bg-[#ECE7FF] dark:bg-zinc-800 px-2.5 py-1 rounded-full flex-row items-center">
          <AppText weight="bold" className="text-[#7859d9] text-[11px]">
            Tasa: Bs. {effectiveRate}
          </AppText>
        </View>
      </View>

      {/* Selector de Dirección de Conversión */}
      <View className="flex-row gap-2 mb-4 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-2xl">
        <TouchableOpacity
          onPress={() => setDirection('USD_TO_BS')}
          className={`flex-1 py-2 rounded-xl items-center ${
            isUsdToBs
              ? 'bg-[#7859d9]'
              : 'bg-transparent'
          }`}
        >
          <AppText
            weight="bold"
            className={`text-xs ${isUsdToBs ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
          >
            $ USD → Bs.
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDirection('BS_TO_USD')}
          className={`flex-1 py-2 rounded-xl items-center ${
            !isUsdToBs
              ? 'bg-[#7859d9]'
              : 'bg-transparent'
          }`}
        >
          <AppText
            weight="bold"
            className={`text-xs ${!isUsdToBs ? 'text-white' : 'text-zinc-600 dark:text-zinc-400'}`}
          >
            Bs. → $ USD
          </AppText>
        </TouchableOpacity>
      </View>

      {/* Input de Monto */}
      <AppText
        weight="semibold"
        className="text-[11px] text-[#8a8a8e] mb-1.5 uppercase tracking-wide"
      >
        Monto a Convertir ({isUsdToBs ? 'Dólares $' : 'Bolívares Bs.'})
      </AppText>
      <View className="flex-row items-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 mb-2.5 border border-zinc-200 dark:border-zinc-700">
        <AppText
          weight="bold"
          className="text-base text-zinc-500 dark:text-zinc-400 mr-2"
        >
          {isUsdToBs ? '$' : 'Bs.'}
        </AppText>
        <TextInput
          value={amountStr}
          onChangeText={(text) => {
            setAmountStr(text);
            setCopied(false);
          }}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#94a3b8"
          style={typography.bold}
          className="flex-1 text-xl text-zinc-900 dark:text-zinc-100"
        />
        {amountStr.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              setAmountStr('');
              setCopied(false);
            }}
            className="p-1"
          >
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Atajos Rápidos */}
      <View className="flex-row gap-1.5 mb-4">
        {(isUsdToBs ? ['5', '10', '20', '50', '100'] : ['100', '500', '1000', '2000', '5000']).map((val) => (
          <TouchableOpacity
            key={val}
            onPress={() => setQuickAmount(val)}
            className={`flex-1 py-1.5 rounded-xl items-center border ${
              amountStr === val
                ? 'bg-[#ECE7FF] dark:bg-zinc-800 border-[#7859d9]/40'
                : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/60 dark:border-zinc-700/60'
            }`}
          >
            <AppText
              weight={amountStr === val ? 'bold' : 'medium'}
              className={`text-[11px] ${
                amountStr === val ? 'text-[#7859d9]' : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {isUsdToBs ? `$${val}` : `${val} Bs`}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tarjeta de Resultado de Conversión y Botón de Copiar */}
      <View className="bg-[#F6F7FB] dark:bg-zinc-800/80 rounded-2xl p-4 border border-zinc-200/70 dark:border-zinc-700/70">
        <View className="flex-row justify-between items-center mb-1">
          <AppText
            weight="semibold"
            className="text-xs text-[#8a8a8e]"
          >
            {isUsdToBs ? 'Equivalente en Bolívares:' : 'Equivalente en Dólares:'}
          </AppText>
          <AppText
            weight="medium"
            className="text-[10px] text-[#aeaeaf]"
          >
            {calculationDetail}
          </AppText>
        </View>

        <View className="flex-row items-center justify-between mt-1">
          {/* Monto Resultante */}
          <AppText
            weight="extrabold"
            className="text-2xl text-[#1a1a1a] dark:text-zinc-100 flex-1 mr-3"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {resultFormatted}
          </AppText>

          {/* Botón Copiar Monto */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleCopy}
            className={`flex-row items-center px-3.5 py-2.5 rounded-xl ${
              copied
                ? 'bg-emerald-500'
                : 'bg-[#7859d9] active:bg-[#6845cb]'
            }`}
          >
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={15}
              color="#ffffff"
            />
            <AppText
              weight="bold"
              className="text-white text-xs ml-1.5"
            >
              {copied ? '¡Copiado!' : 'Copiar'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
