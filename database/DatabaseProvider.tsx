import React, { Suspense } from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { ActivityIndicator, View, Text } from 'react-native';
import { DATABASE_NAME, initializeDatabase } from './index';
import { Fonts } from '@/constants/Typography';

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseLoadingFallback() {
  return (
    <View className="flex-1 justify-center items-center bg-[#F6F7FB] dark:bg-[#121214] p-6">
      <ActivityIndicator size="large" color="#7859d9" />
      <Text
        style={{ fontFamily: Fonts.bold }}
        className="mt-4 text-base text-[#1a1a1a] dark:text-zinc-100"
      >
        EasyPay Contable
      </Text>
      <Text
        style={{ fontFamily: Fonts.medium }}
        className="mt-1 text-xs text-[#8a8a8e]"
      >
        Iniciando base de datos SQLite...
      </Text>
    </View>
  );
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  return (
    <Suspense fallback={<DatabaseLoadingFallback />}>
      <SQLiteProvider
        databaseName={DATABASE_NAME}
        onInit={initializeDatabase}
        useSuspense={true}
      >
        {children}
      </SQLiteProvider>
    </Suspense>
  );
}
