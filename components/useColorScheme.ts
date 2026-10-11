import { useEffect } from 'react';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useThemeStore } from '@/store/themeStore';

export const useColorScheme = () => {
  const { colorScheme: nativeWindScheme, setColorScheme: setNativeWindScheme } = useNativeWindColorScheme();
  const theme = useThemeStore((state) => state.colorScheme);
  const isHydrated = useThemeStore((state) => state.isHydrated);

  useEffect(() => {
    if (isHydrated && nativeWindScheme !== theme) {
      setNativeWindScheme(theme);
    }
  }, [theme, isHydrated, nativeWindScheme, setNativeWindScheme]);

  return theme;
};

