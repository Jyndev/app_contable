import { useThemeStore } from '@/store/themeStore';

export function useColorScheme() {
  return useThemeStore((state) => state.colorScheme) || 'light';
}
