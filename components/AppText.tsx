import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { typography, Fonts } from '@/constants/Typography';

export interface AppTextProps extends RNTextProps {
  weight?: keyof typeof typography;
}

export function AppText({
  weight = 'regular',
  style,
  maxFontSizeMultiplier = 1.25,
  ...props
}: AppTextProps) {
  const fontStyle = typography[weight] || typography.regular;
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[fontStyle, style]}
      {...props}
    />
  );
}
