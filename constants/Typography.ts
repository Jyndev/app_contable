import { TextStyle } from 'react-native';

export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

export const typography: Record<keyof typeof Fonts, TextStyle> = {
  regular: { fontFamily: Fonts.regular, fontWeight: 'normal', fontStyle: 'normal' },
  medium: { fontFamily: Fonts.medium, fontWeight: 'normal', fontStyle: 'normal' },
  semibold: { fontFamily: Fonts.semibold, fontWeight: 'normal', fontStyle: 'normal' },
  bold: { fontFamily: Fonts.bold, fontWeight: 'normal', fontStyle: 'normal' },
  extrabold: { fontFamily: Fonts.extrabold, fontWeight: 'normal', fontStyle: 'normal' },
};
