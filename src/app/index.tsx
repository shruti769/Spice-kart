import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FocusStatusBar } from '@/components/ui/focus-status-bar';
import { Txt, usePad } from '@/components/ui/primitives';
import { f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';

const LIME = '#A2F74E';

/** Original artwork extracted from the supplied SVG's embedded PNG. */
function Backdrop() {
  return (
    <Image
      source={require('../../assets/images/brand/splash-background.png')}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      accessible={false}
      pointerEvents="none"
    />
  );
}

function Dot() {
  return <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: LIME }} />;
}

export default function SplashScreen() {
  const pad = usePad();
  const done = useRef(false);
  const t = useSharedValue(0);

  const skip = useCallback(() => {
    if (done.current) return;
    done.current = true;
    router.replace('/login');
  }, []);

  useEffect(() => {
    t.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    const timer = setTimeout(skip, 2000);
    return () => clearTimeout(timer);
  }, [skip, t]);

  const logo = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: 0.86 + 0.14 * t.value }],
  }));

  return (
    <Pressable onPress={skip} style={{ flex: 1, backgroundColor: '#071B13' }} accessibilityRole="button" accessibilityLabel="Skip">
      <FocusStatusBar style="light" />
      <Backdrop />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ width: 74, height: 74, alignItems: 'center', justifyContent: 'center' }, logo]}>
          <View
            style={{
              position: 'absolute',
              width: 70,
              height: 70,
              borderRadius: 17,
              backgroundColor: '#0A2410',
              boxShadow: '0 0 26px 2px rgba(139,224,0,0.30)',
            }}
          />
          <Image source={LOCAL.appIcon} accessibilityLabel="Spice Kart" style={{ width: 84, height: 84 }} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(520)} style={{ marginTop: 18 }}>
          <Image source={LOCAL.wordmarkLight} accessibilityLabel="SpiceKart" contentFit="contain" style={{ width: 190, aspectRatio: 887 / 181 }} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(320).duration(520)} style={{ marginTop: 17, flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          <Txt style={[f(400, 11, 1.2), { color: 'rgba(255,255,255,0.92)' }]}>Click</Txt>
          <Dot />
          <Txt style={[f(400, 11, 1.2), { color: 'rgba(255,255,255,0.92)' }]}>Cart</Txt>
          <Dot />
          <Txt style={[f(400, 11, 1.2), { color: 'rgba(255,255,255,0.92)' }]}>Delivered</Txt>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(440).duration(520)} style={{ marginTop: 12 }}>
          <Txt style={[f(400, 15.5, 1.3), { color: '#BAC6BF', letterSpacing: 0.1 }]}>Skip the store. Enjoy more.</Txt>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.delay(500).duration(600)} style={{ position: 'absolute', left: 0, right: 0, bottom: pad.bottom(48), alignItems: 'center' }}>
        <Txt style={[f(500, 9.5, 1), { letterSpacing: 1, color: '#829787' }]}>GROCERIES DELIVERED · AUSTRALIA</Txt>
      </Animated.View>
    </Pressable>
  );
}
