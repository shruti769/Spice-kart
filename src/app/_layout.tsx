import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast } from '@/components/overlays';
import { C } from '@/constants/theme';
import { startRemoteBanners } from '@/lib/remote-banners';
import { startRemoteCatalog } from '@/lib/remote-catalog';
import { startRemoteCoupons } from '@/lib/remote-coupons';
import { startRemoteDelivery } from '@/lib/remote-delivery';
import { startRemoteOffers } from '@/lib/remote-offers';
import { checkSupabaseConnection } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

// Dev only: log once whether the Supabase keys in .env work.
if (__DEV__) checkSupabaseConnection().then((msg) => console.log(msg));

// Products added in the admin panel (Supabase) appear alongside the built-in catalogue.
startRemoteCatalog();
startRemoteCoupons();
startRemoteDelivery();
startRemoteOffers();
startRemoteBanners();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: C.bg },
            animation: 'ios_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}>
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
          <Stack.Screen name="location" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="order-confirmed" options={{ animation: 'fade_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="money/success" options={{ animation: 'fade_from_bottom', gestureEnabled: false }} />
          <Stack.Screen name="money/failed" options={{ animation: 'fade_from_bottom' }} />
        </Stack>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
