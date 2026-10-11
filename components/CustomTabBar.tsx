import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  FadeInRight,
  FadeOutLeft,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { useColorScheme } from '@/components/useColorScheme';

interface TabConfig {
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
}

const TAB_CONFIGS: Record<string, TabConfig> = {
  index: {
    label: 'Inicio',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  gastos: {
    label: 'Gastos',
    activeIcon: 'wallet',
    inactiveIcon: 'wallet-outline',
  },
  deudas: {
    label: 'Deudas',
    activeIcon: 'card',
    inactiveIcon: 'card-outline',
  },
  ahorros: {
    label: 'Ahorros',
    activeIcon: 'sparkles',
    inactiveIcon: 'sparkles-outline',
  },
  proveedores: {
    label: 'Proveedor',
    activeIcon: 'business',
    inactiveIcon: 'business-outline',
  },
};

export interface CustomTabBarProps {
  state: {
    index: number;
    routes: Array<{
      key: string;
      name: string;
      params?: any;
    }>;
  };
  descriptors?: any;
  navigation: any;
  insets?: any;
}

export function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!state || !state.routes) {
    return null;
  }

  const validRoutes = state.routes.filter((route: { name: string }) => TAB_CONFIGS[route.name]);
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 16);

  return (
    <View
      style={[
        styles.outerContainer,
        {
          bottom: bottomInset,
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.pillContainer,
          isDark ? styles.pillContainerDark : styles.pillContainerLight,
        ]}
      >
        {validRoutes.map((route) => {
          const isFocused = state.routes[state.index]?.name === route.name;
          const config = TAB_CONFIGS[route.name] || {
            label: route.name,
            activeIcon: 'ellipse',
            inactiveIcon: 'ellipse-outline',
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Animated.View
              key={route.key}
              layout={LinearTransition.springify().damping(15).stiffness(140)}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: isFocused }}
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={0.8}
                style={[
                  styles.tabButton,
                  isFocused && (isDark ? styles.activeTabDark : styles.activeTabLight),
                ]}
              >
                <Ionicons
                  name={isFocused ? config.activeIcon : config.inactiveIcon}
                  size={20}
                  color={
                    isFocused
                      ? isDark
                        ? '#A78BFA'
                        : '#7859d9'
                      : isDark
                      ? '#71717A'
                      : '#8E8E93'
                  }
                />
                {isFocused && (
                  <Animated.View
                    entering={FadeInRight.duration(180).springify().damping(14)}
                    exiting={FadeOutLeft.duration(120)}
                    style={styles.labelWrapper}
                  >
                    <AppText
                      weight="bold"
                      style={[
                        styles.activeTabText,
                        { color: isDark ? '#A78BFA' : '#7859d9' },
                      ]}
                    >
                      {config.label}
                    </AppText>
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    height: 54,
    borderRadius: 36,
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  pillContainerLight: {
    backgroundColor: '#FFFFFF',
  },
  pillContainerDark: {
    backgroundColor: '#18181B',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    paddingHorizontal: 11,
    borderRadius: 22,
    gap: 5,
  },
  activeTabLight: {
    backgroundColor: '#ECE7FF',
  },
  activeTabDark: {
    backgroundColor: '#2E2254',
  },
  labelWrapper: {
    overflow: 'hidden',
  },
  activeTabText: {
    fontSize: 12,
  },
});
