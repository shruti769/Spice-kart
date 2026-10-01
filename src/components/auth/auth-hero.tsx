import { Image } from 'expo-image';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { LoginProducts } from '@/components/auth/login-products';
import { Grad } from '@/components/ui/primitives';
import { LOCAL } from '@/data/catalog';

/** How far the white auth sheet overlaps the hero so its rounded top sits on the green. */
export const SHEET_OVERLAP = 14;

/** Green hero with the moving product tiles and centred brand, shared by login and OTP. */
export function AuthHero() {
  const { height } = useWindowDimensions();
  const heroHeight = Math.max(300, height * 0.475) + SHEET_OVERLAP;

  return (
    <View style={[styles.hero, { height: heroHeight }]}>
      <Grad preset="hero" style={StyleSheet.absoluteFill} />
      <LoginProducts />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
      <Grad colors={['rgba(8,53,26,0)', 'rgba(8,53,26,0)', 'rgba(8,53,26,0.68)']} locations={[0, 0.62, 1]} style={StyleSheet.absoluteFill} />
      <View style={styles.brand}>
        <Image source={LOCAL.appIcon} style={styles.appIcon} accessibilityLabel="Spice Kart" />
        <Image source={LOCAL.wordmarkLight} contentFit="contain" style={styles.wordmark} accessibilityLabel="SpiceKart" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', justifyContent: 'flex-end', paddingBottom: 28 + SHEET_OVERLAP },
  tint: { backgroundColor: 'rgba(8,53,26,0.2)' },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  appIcon: { width: 38, height: 38, borderRadius: 9 },
  wordmark: { width: 100, height: 24 },
});
