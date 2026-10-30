import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, Footer, PrimaryButton, SecureNote, useWalletVals } from '@/components/money/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Txt } from '@/components/ui/primitives';
import { f } from '@/constants/theme';

export default function PayMethodScreen() {
  const { amountStr } = useWalletVals();
  return (
    <Screen>
      <ScreenHeader variant="tint" title="Payment method" subtitle={`Adding ${amountStr} to your wallet`} />
      <View style={{ padding: 14, gap: 14 }}>
        <Card style={{ padding: 16 }}>
          <Txt style={f(400, 14, 1.5)}>
            Choose a saved card, enter a new card, or use an available digital wallet on the secure payment screen after
            confirming your top-up.
          </Txt>
        </Card>
        <SecureNote />
      </View>
      <Footer>
        <PrimaryButton tone="lime" label="Review top-up" onPress={() => router.push('/money/confirm')} />
      </Footer>
    </Screen>
  );
}
