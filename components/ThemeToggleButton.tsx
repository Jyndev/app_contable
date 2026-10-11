import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import { useThemeStore } from '@/store/themeStore';

interface ThemeToggleButtonProps {
  className?: string;
}

export function ThemeToggleButton({ className = '' }: ThemeToggleButtonProps) {
  const { setColorScheme } = useNativeWindColorScheme();
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const isDark = colorScheme === 'dark';

  const handleToggle = () => {
    const nextScheme = toggleTheme();
    setColorScheme(nextScheme);
  };

  return (
    <TouchableOpacity
      onPress={handleToggle}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`w-9 h-9 rounded-full items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 ${className}`}
    >
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={18}
        color={isDark ? '#fbbf24' : '#7859d9'}
      />
    </TouchableOpacity>
  );
}
