import { Tabs } from 'expo-router/js-tabs';

import { BottomNav } from '@/components/bottom-nav';
import { C } from '@/constants/theme';
import type { TabName } from '@/lib/nav';

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        // No cross-fade: switching tabs from code (e.g. Home "See all") could leave the new tab stuck invisible.
        animation: 'none',
        sceneStyle: { backgroundColor: C.bg },
      }}
      tabBar={({ state }) => {
        const name = state.routes[state.index].name as TabName;
        return <BottomNav active={name} showCartBar={name !== 'orders'} />;
      }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="categories" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="orders" />
    </Tabs>
  );
}
