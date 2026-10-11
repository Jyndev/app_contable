import React from 'react';
import { Tabs } from 'expo-router';
import { CustomTabBar } from '@/components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
        }}
      />
      <Tabs.Screen
        name="gastos"
        options={{
          title: 'Gastos',
        }}
      />
      <Tabs.Screen
        name="deudas"
        options={{
          title: 'Deudas',
        }}
      />
      <Tabs.Screen
        name="ahorros"
        options={{
          title: 'Ahorros',
        }}
      />
      <Tabs.Screen
        name="proveedores"
        options={{
          title: 'Proveedor',
        }}
      />
    </Tabs>
  );
}
