import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Marquee photos and timings copied from the Spice Kart Redesign login/OTP hero.
const MARQ_A = [
  require('@/assets/images/login/marquee/tomato.jpg'),
  require('@/assets/images/login/marquee/milk-bottle.jpg'),
  require('@/assets/images/login/marquee/banana.jpg'),
  require('@/assets/images/login/marquee/bread-loaf.jpg'),
  require('@/assets/images/login/marquee/cheese.jpg'),
  require('@/assets/images/login/marquee/avocado.jpg'),
  require('@/assets/images/login/marquee/eggs.jpg'),
  require('@/assets/images/login/marquee/carrot.jpg'),
];
const MARQ_B = [
  require('@/assets/images/login/marquee/basmati-rice.jpg'),
  require('@/assets/images/login/marquee/apple.jpg'),
  require('@/assets/images/login/marquee/grapes.jpg'),
  require('@/assets/images/login/marquee/broccoli.jpg'),
  require('@/assets/images/login/marquee/olive-oil.jpg'),
  require('@/assets/images/login/marquee/yogurt.jpg'),
  require('@/assets/images/login/marquee/lemon.jpg'),
  require('@/assets/images/login/marquee/garam-masala.jpg'),
];
const MARQ_C = [
  require('@/assets/images/login/marquee/strawberry.jpg'),
  require('@/assets/images/login/marquee/onion.jpg'),
  require('@/assets/images/login/marquee/sourdough.jpg'),
  require('@/assets/images/login/marquee/potato-chips.jpg'),
  require('@/assets/images/login/marquee/oat-milk.jpg'),
  require('@/assets/images/login/marquee/garlic.jpg'),
  require('@/assets/images/login/marquee/turmeric-powder.jpg'),
  require('@/assets/images/login/marquee/pasta-penne.jpg'),
];

type Row = { products: number[]; seconds: number; reverse?: boolean };

// `reverse` rows run left-to-right (sk-marq-b); the others run right-to-left (sk-marq-a).
const ROWS: Row[] = [{ products: MARQ_A, seconds: 26 }, { products: MARQ_B, seconds: 32, reverse: true }, { products: MARQ_C, seconds: 29 }];

const TILE = 96;
const GAP = 12;

function ProductRow({ products, seconds, reverse }: Row) {
  const period = products.length * (TILE + GAP);
  const progress = useSharedValue(0);

  useFocusEffect(useCallback(() => {
    const start = () => {
      progress.set(0);
      progress.set(withRepeat(withTiming(1, { duration: seconds * 1000, easing: Easing.linear }), -1));
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
  }, [seconds, progress]));

  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: reverse ? (progress.value - 1) * period : -progress.value * period }],
  }));

  return (
    <Animated.View style={[styles.row, { width: period * 2 - GAP }, motion]}>
      {[...products, ...products].map((source, index) => (
        <View key={index} style={styles.tile}>
          <Image source={source} contentFit="cover" style={styles.image} />
        </View>
      ))}
    </Animated.View>
  );
}

/** Tilted, seamless product marquee from the redesign's login and OTP hero. */
export function LoginProducts() {
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <View style={[styles.field, { transform: [{ rotate: '-9deg' }, { scale: 1.16 }] }]}>
        {ROWS.map((row, index) => <ProductRow key={index} {...row} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', gap: GAP },
  row: { flexDirection: 'row', gap: GAP, alignSelf: 'flex-start' },
  tile: { width: TILE, height: TILE, borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 4px 14px rgba(10,40,20,0.14)' },
  image: { position: 'absolute', left: '-5%', top: '-5%', width: '110%', height: '110%' },
});
