import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Footer, PrimaryButton, useWalletVals } from '@/components/money/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Grid, Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

const PRESETS = [10, 25, 50, 100];
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const;
const MIN = 5;
const MAX = 500;

/**
 * Apply a keypad press to the typed amount. Returns null when the key is not allowed:
 * a second ".", a third decimal digit, or a value over the $500 top-up limit.
 */
function nextAmount(cur: string, k: (typeof KEYS)[number]): string | null {
  if (k === 'del') return cur.slice(0, -1);
  if (k === '.') {
    if (cur.includes('.')) return null;
    return (cur || '0') + '.';
  }
  const [, decimals] = cur.split('.');
  if (decimals !== undefined && decimals.length >= 2) return null;
  const next = cur === '0' ? k : cur + k;
  return parseFloat(next) > MAX ? null : next;
}

/** Blinking lime caret after the amount. */
function Caret() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(
      withRepeat(
        withSequence(withTiming(0, { duration: 530, easing: Easing.linear }), withTiming(1, { duration: 530, easing: Easing.linear })),
        -1,
      ),
    );
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value > 0.5 ? 1 : 0 }));
  return <Animated.View style={[{ width: 2, height: 46, backgroundColor: C.lime, marginLeft: 3 }, style]} />;
}

/** Custom top-up amount with keypad (prototype `sAmount`). */
export default function AmountScreen() {
  const { amountRaw, amountHint, amountHintColor, amountText, amtErr } = useWalletVals();
  const set = useApp((s) => s.set);

  const press = (k: (typeof KEYS)[number]) => {
    const cur = useApp.getState().amountText || '';
    const next = nextAmount(cur, k);
    if (next === null) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    set({ amountText: next });
  };

  const onContinue = () => {
    if (amtErr) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      useApp.getState().flash('Enter an amount between $' + MIN + ' and $' + MAX);
      return;
    }
    router.push('/money/confirm');
  };

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Add money" subtitle="Minimum $5 · maximum $500" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 8, paddingTop: 22, paddingBottom: 6 }}>
          <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.6, color: C.muted2 }]}>
            ENTER AMOUNT
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 3 }}>
            <Txt style={[f(700, 22, 1.5), { color: C.forest }]}>$</Txt>
            <Txt numberOfLines={1} style={[f(800, 48, 1), { color: C.forest, letterSpacing: -1.5 }]}>
              {amountRaw}
            </Txt>
            <Caret />
          </View>
          <Txt numberOfLines={1} style={[f(400, 11, 1), { color: amountHintColor }]}>
            {amountHint}
          </Txt>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {PRESETS.map((v) => {
            const on = String(v) === amountText;
            return (
              <Tap
                key={v}
                onPress={() => set({ amountText: String(v) })}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={{
                  height: 34,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: on ? C.lime : C.border,
                  backgroundColor: on ? C.selectedBgAlt : '#fff',
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Txt style={[f(600, 12.5, 1), { color: C.forest }]}>${v}</Txt>
              </Tap>
            );
          })}
        </View>

        <Grid
          data={[...KEYS]}
          columns={3}
          gap={8}
          style={{ marginTop: 4 }}
          keyOf={(k) => k}
          renderItem={(k) => {
            const del = k === 'del';
            return (
              <Tap
                onPress={() => press(k)}
                accessibilityRole="button"
                accessibilityLabel={del ? 'Delete' : k}
                style={{
                  height: 52,
                  borderRadius: 11,
                  borderWidth: 1,
                  borderColor: C.borderCard,
                  backgroundColor: del ? C.bg : '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                pressedStyle={{ backgroundColor: del ? '#ECEDE9' : '#F4F5F1', transform: [{ scale: 0.97 }] }}>
                {del ? (
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M9 5h10a1.5 1.5 0 011.5 1.5v11A1.5 1.5 0 0119 19H9l-5.5-7L9 5z"
                      stroke="#3F3F3B"
                      strokeWidth={1.6}
                      strokeLinejoin="round"
                    />
                    <Path d="M12.5 9.5l5 5M17.5 9.5l-5 5" stroke="#3F3F3B" strokeWidth={1.6} strokeLinecap="round" />
                  </Svg>
                ) : (
                  <Txt style={[f(600, 19, 1), { color: C.ink }]}>{k}</Txt>
                )}
              </Tap>
            );
          }}
        />
      </ScrollView>
      <Footer>
        <View style={{ opacity: amtErr ? 0.5 : 1 }}>
          <PrimaryButton tone="lime" label="Continue" onPress={onContinue} />
        </View>
      </Footer>
    </Screen>
  );
}
