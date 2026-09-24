import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Card, Footer, KV, PrimaryButton, SecondaryButton, useWalletVals } from '@/components/money/parts';
import { Screen, Txt, usePad } from '@/components/ui/primitives';
import { f } from '@/constants/theme';
import { useTopUpMethod } from '@/store/app-store';

/** Top-up declined (prototype `sMoneyFail`). */
export default function MoneyFailedScreen() {
  const pad = usePad();
  const { amountStr, walletStr } = useWalletVals();
  const method = useTopUpMethod();
  const openPayMethod = () => router.push('/money/pay-method');

  return (
    <Screen>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: pad.top(52), paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 10, paddingTop: 24, paddingBottom: 4 }}>
          <Animated.View
            entering={ZoomIn.springify().damping(14)}
            style={{
              width: 74,
              height: 74,
              borderRadius: 37,
              backgroundColor: '#FBF0DE',
              borderWidth: 1,
              borderColor: '#EEDCB9',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
              <Path d="M16 9v9" stroke="#B07A12" strokeWidth={3} strokeLinecap="round" />
              <Circle cx={16} cy={23} r={1.8} fill="#B07A12" />
            </Svg>
          </Animated.View>
          <Txt numberOfLines={1} style={[f(700, 20, 1.3), { textAlign: 'center' }]}>
            We couldn&apos;t add that money
          </Txt>
          <Txt style={[f(400, 12.5, 1.55), { color: '#6E6E68', maxWidth: 270, textAlign: 'center' }]}>
            Your bank declined the payment, so nothing was charged and your balance is unchanged.
          </Txt>
        </View>

        <Card>
          <KV k="Attempted amount" v={amountStr} weight={600} />
          <KV k="Card" v={method.short} />
          <KV k="Balance" v={`${walletStr}.00 · unchanged`} last />
        </Card>

        <View
          style={{
            gap: 7,
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#F7FAF2',
            borderWidth: 1,
            borderColor: '#E4EBD8',
          }}>
          <Txt numberOfLines={1} style={[f(600, 11.5, 1), { color: '#3F5B43' }]}>
            What you can try
          </Txt>
          <Txt style={[f(400, 10.5, 1.6), { color: '#5F6B57' }]}>
            Check the card has funds available, try a different payment method, or contact your bank if this keeps
            happening.
          </Txt>
        </View>
      </ScrollView>
      <Footer>
        <PrimaryButton label="Try again" onPress={openPayMethod} />
        <SecondaryButton label="Use another payment method" onPress={openPayMethod} />
        <SecondaryButton label="Contact support" onPress={() => router.push('/support')} />
      </Footer>
    </Screen>
  );
}
