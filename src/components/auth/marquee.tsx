import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Photo } from '@/components/ui/primitives';
import { photo } from '@/data/catalog';

const TILE = 88;
const GAP = 12;

/** Photo keys for the prototype's `marqA` / `marqB` / `marqC` rows (each list is rendered twice). */
export const MARQ_A = ['tomato', 'milk,bottle', 'banana', 'bread,loaf', 'cheese', 'avocado', 'eggs', 'carrot'];
export const MARQ_B = ['basmati,rice', 'apple', 'butter', 'broccoli', 'olive,oil', 'yogurt', 'lemon', 'garam,masala'];
export const MARQ_C = ['strawberry', 'onion', 'sourdough', 'potato,chips', 'oat,milk', 'garlic', 'turmeric,powder', 'pasta,penne'];

export type MarqueeRowDef = {
  keys: string[];
  /** Seconds for one loop (CSS animation duration). */
  duration: number;
  /** `sk-marq-b` (−50% → 0) instead of `sk-marq-a` (0 → −50%). */
  reverse?: boolean;
};

/** One infinitely scrolling row of 88px product tiles. */
function MarqueeRow({ keys, duration, reverse }: MarqueeRowDef) {
  const list = [...keys, ...keys];
  const period = keys.length * (TILE + GAP);
  const x = useSharedValue(reverse ? -period : 0);

  useEffect(() => {
    x.value = reverse ? -period : 0;
    x.value = withRepeat(
      withTiming(reverse ? 0 : -period, { duration: duration * 1000, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(x);
  }, [x, period, duration, reverse]);

  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Animated.View
      style={[
        { flexDirection: 'row', gap: GAP, alignSelf: 'flex-start', width: list.length * TILE + (list.length - 1) * GAP },
        anim,
      ]}>
      {list.map((k, i) => (
        <View key={i} style={{ width: TILE, height: TILE, borderRadius: 16, boxShadow: '0 4px 14px rgba(10,40,20,0.14)' }}>
          <Photo source={photo(k)} style={{ width: TILE, height: TILE, borderRadius: 16, backgroundColor: '#fff' }} />
        </View>
      ))}
    </Animated.View>
  );
}

/** Tilted marquee of product tiles behind the login / OTP heroes. */
export function Marquee({ rows, scale }: { rows: MarqueeRowDef[]; scale: number }) {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { justifyContent: 'center', gap: 12, transform: [{ rotate: '-9deg' }, { scale }] },
      ]}>
      {rows.map((r, i) => (
        <MarqueeRow key={i} {...r} />
      ))}
    </View>
  );
}
