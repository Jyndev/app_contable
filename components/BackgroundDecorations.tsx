import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColorScheme } from '@/components/useColorScheme';

export function BackgroundDecorations() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Cápsula diagonal superior derecha */}
      <View
        style={[
          styles.pillTopRight,
          isDark ? styles.accentDark : styles.accentLight,
        ]}
      />
      <View
        style={[
          styles.pillTopRightSmall,
          isDark ? styles.accentDarkFaint : styles.accentLightFaint,
        ]}
      />

      {/* 2. Squircle / Rombo redondeado en el centro-izquierdo */}
      <View
        style={[
          styles.squircleCenterLeft,
          isDark ? styles.accentDark : styles.accentLight,
        ]}
      />
      <View
        style={[
          styles.squircleCenterLeftRing,
          isDark ? styles.ringDark : styles.ringLight,
        ]}
      />

      {/* 3. Barra flotante diagonal inferior derecha */}
      <View
        style={[
          styles.pillBottomRight,
          isDark ? styles.accentDark : styles.accentLight,
        ]}
      />

      {/* 4. Mini pastilla decorativa superior izquierda */}
      <View
        style={[
          styles.capsuleTopLeft,
          isDark ? styles.accentDarkFaint : styles.accentLightFaint,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Paletas de color tenues y discretas
  accentLight: {
    backgroundColor: 'rgba(120, 89, 217, 0.055)',
  },
  accentDark: {
    backgroundColor: 'rgba(167, 139, 250, 0.065)',
  },
  accentLightFaint: {
    backgroundColor: 'rgba(120, 89, 217, 0.035)',
  },
  accentDarkFaint: {
    backgroundColor: 'rgba(167, 139, 250, 0.045)',
  },
  ringLight: {
    borderColor: 'rgba(120, 89, 217, 0.06)',
    borderWidth: 1.5,
  },
  ringDark: {
    borderColor: 'rgba(167, 139, 250, 0.07)',
    borderWidth: 1.5,
  },

  // Formas geométricas distintas a círculos estándar
  pillTopRight: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 240,
    height: 70,
    borderRadius: 35,
    transform: [{ rotate: '-35deg' }],
  },
  pillTopRightSmall: {
    position: 'absolute',
    top: 55,
    right: -20,
    width: 140,
    height: 38,
    borderRadius: 19,
    transform: [{ rotate: '-35deg' }],
  },
  squircleCenterLeft: {
    position: 'absolute',
    top: 310,
    left: -65,
    width: 150,
    height: 150,
    borderRadius: 42,
    transform: [{ rotate: '45deg' }],
  },
  squircleCenterLeftRing: {
    position: 'absolute',
    top: 290,
    left: -85,
    width: 190,
    height: 190,
    borderRadius: 54,
    transform: [{ rotate: '45deg' }],
  },
  pillBottomRight: {
    position: 'absolute',
    bottom: 110,
    right: -70,
    width: 260,
    height: 60,
    borderRadius: 30,
    transform: [{ rotate: '25deg' }],
  },
  capsuleTopLeft: {
    position: 'absolute',
    top: 80,
    left: -30,
    width: 90,
    height: 32,
    borderRadius: 16,
    transform: [{ rotate: '20deg' }],
  },
});
