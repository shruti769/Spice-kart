import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Product artwork from the design's two tile variants.
const VARIANT_1 = [
  require('@/assets/images/login/fortune.png'),
  require('@/assets/images/login/amul-icecream.png'),
  require('@/assets/images/login/masti.png'),
  require('@/assets/images/login/broccoli.png'),
  require('@/assets/images/login/onion.png'),
  require('@/assets/images/login/silk.png'),
  require('@/assets/images/login/aashirvaad.png'),
  require('@/assets/images/login/bread.png'),
];
const VARIANT_2 = [
  require('@/assets/images/login/barilla.png'),
  require('@/assets/images/login/everest.png'),
  require('@/assets/images/login/maggi.png'),
  require('@/assets/images/login/mtr.png'),
  require('@/assets/images/login/peas.png'),
  require('@/assets/images/login/taaza.png'),
  require('@/assets/images/login/daawat.png'),
  require('@/assets/images/login/amul-cheese.png'),
];
const ROWS = [
  { products: VARIANT_1, offset: -0.1, speed: 0.95 },
  { products: VARIANT_2, offset: -0.04, speed: 0.87 },
  { products: VARIANT_1, offset: -0.12, speed: 0.95 },
];

function ProductRow({ width, products, offset, speed }: { width: number; products: number[]; offset: number; speed: number }) {
  const tile = width * 0.26;
  const gap = width * 0.04;
  const period = products.length * (tile + gap);
  const progress = useSharedValue(0);
  const duration = period / (width * speed) * 1000;

  useFocusEffect(useCallback(() => {
    const start = () => {
      progress.set(0);
      progress.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1));
    };
    if (AppState.currentState === 'active' || AppState.currentState === null) start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else cancelAnimation(progress);
    });
    return () => {
      cancelAnimation(progress);
      subscription.remove();
    };
  }, [duration, progress]));

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: width * offset - progress.value * period }],
  }));

  return (
    <Animated.View style={[styles.row, { gap, width: period * 2 - gap }, motion]}>
      {[...products, ...products].map((source, index) => (
        // Product centred on a white rounded card with breathing room, as in the design.
        <View key={index} style={[styles.tile, { width: tile, height: tile, borderRadius: width * 0.045, padding: tile * 0.1 }]}>
          <Image source={source} contentFit="contain" style={styles.image} />
        </View>
      ))}
    </Animated.View>
  );
}

/** Horizontal, seamless product loops measured from the supplied login recording. */
export function LoginProducts({ width }: { width: number }) {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.products}>
      {ROWS.map((row, index) => <ProductRow key={index} width={width} {...row} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  products: { position: 'absolute', top: 16, right: 0, bottom: 0, left: 0, justifyContent: 'space-between' },
  row: { flexDirection: 'row' },
  tile: { backgroundColor: '#fff', overflow: 'hidden' },
  image: { flex: 1 },
});
