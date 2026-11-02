import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Card, Footer, KV, PrimaryButton, SecondaryButton, useWalletVals } from '@/components/money/parts';
import { Grad, Screen, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';
import { goTab } from '@/lib/nav';
import { useWalletStore } from '@/lib/remote-wallet';
import { useTopUpMethod } from '@/store/app-store';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_LEN = 24;

/** Lime disc that springs in, then draws its check mark. */
function SuccessCheck() {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);
  const draw = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 180 });
    scale.value = withSpring(1, { damping: 11, stiffness: 180, mass: 0.8 });
    draw.value = withDelay(180, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
  }, [scale, opacity, draw]);

  const disc = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));
  const stroke = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - draw.value) }));

  return (
    <Animated.View
      style={[
        {
          width: 74,
          height: 74,
          borderRadius: 37,
          backgroundColor: C.lime,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 24px rgba(107,176,0,0.28)',
        },
        disc,
      ]}>
      <Svg width={34} height={34} viewBox="0 0 32 32" fill="none">
        <AnimatedPath
          d="M8 17l5.5 5.5L24 11"
          stroke={C.forest}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={CHECK_LEN}
          animatedProps={stroke}
        />
      </Svg>
    </Animated.View>
  );
}

const RECENT_MS = 10 * 60_000;

/** Top-up succeeded (prototype `sMoneySuccess`). */
export default function MoneySuccessScreen() {
  const pad = usePad();
  const { amt, amountStr, bal } = useWalletVals();
  const method = useTopUpMethod();
  // The wallet was already credited on confirm, so the new balance is the current one.
  const newBalance = '$' + bal.toFixed(2);
  // This top-up's row, once the wallet has reloaded (null if it hasn't: never show an older one).
  const tx = useWalletStore((s) => s.transactions.find((t) => t.kind === 'topup' && t.amount === amt && Date.now() - new Date(t.createdAt).getTime() < RECENT_MS)) ?? null;

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: pad.top(52), paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 24, paddingBottom: 4 }}>
          <SuccessCheck />
          <Animated.View entering={FadeInDown.delay(160).duration(320)} style={{ alignItems: 'center', gap: 10 }}>
            <Txt numberOfLines={1} style={[f(700, 21, 1.25), { color: C.forest, textAlign: 'center' }]}>
              Money added successfully
            </Txt>
            <Txt style={[f(400, 12.5, 1.5), { color: '#6E6E68', textAlign: 'center' }]}>
              {amountStr} is now in your Spice Kart Money.
            </Txt>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(260).duration(340)} style={{ gap: 12 }}>
          <View style={{ borderRadius: 16, boxShadow: '0 10px 24px rgba(11,61,31,0.2)' }}>
            <Grad preset="wallet" style={{ borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image source={LOCAL.appIcon} style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0 }} />
              <View style={{ gap: 4 }}>
                <Txt numberOfLines={1} style={[f(600, 10.5, 1), { color: 'rgba(255,255,255,0.62)' }]}>
                  NEW BALANCE
                </Txt>
                <Txt numberOfLines={1} style={[f(800, 23, 1), { color: '#fff' }]}>
                  {newBalance}
                </Txt>
              </View>
              <View
                style={{
                  marginLeft: 'auto',
                  backgroundColor: 'rgba(139,224,0,0.16)',
                  paddingVertical: 6,
                  paddingHorizontal: 8,
                  borderRadius: 6,
                }}>
                <Txt numberOfLines={1} style={[f(600, 10, 1), { color: C.lime }]}>
                  INSTANT
                </Txt>
              </View>
            </Grad>
          </View>

          <Card>
            {tx && <KV k="Reference" v={'SKW-' + tx.id} weight={600} />}
            <KV k="Paid with" v={method.short} last={!tx} />
            {tx && <KV k="Date" v={new Date(tx.createdAt).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })} last />}
          </Card>

          <Txt style={[f(400, 10, 1.6), { color: C.muted3, textAlign: 'center' }]}>
            This top-up is saved in your Spice Kart Money activity
          </Txt>
        </Animated.View>
      </ScrollView>
      <Footer>
        <PrimaryButton tone="lime" label="Continue shopping" onPress={() => goTab('home')} />
        <SecondaryButton label="View wallet" onPress={() => router.push('/money')} />
      </Footer>
    </Screen>
  );
}
