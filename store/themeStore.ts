import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppColorScheme = 'light' | 'dark';

interface ThemeState {
  colorScheme: AppColorScheme;
  isHydrated: boolean;
  setScheme: (scheme: AppColorScheme) => void;
  toggleTheme: () => AppColorScheme;
  setHydrated: (hydrated: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorScheme: 'light',
      isHydrated: false,
      setScheme: (scheme: AppColorScheme) => {
        set({ colorScheme: scheme });
      },
      toggleTheme: () => {
        const next: AppColorScheme = get().colorScheme === 'dark' ? 'light' : 'dark';
        set({ colorScheme: next });
        return next;
      },
      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },
    }),
    {
      name: '@app_color_scheme_preference',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
