import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Card, CardGlyph, Footer, IconBox, KV, PrimaryButton, SecondaryButton, SecureNote, useWalletVals } from '@/components/money/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { resetTo } from '@/lib/nav';
import { useApp } from '@/store/app-store';

/** Review the top-up before paying (prototype `sMoneyConfirm`). */
export default function MoneyConfirmScreen() {
  const { amountStr, walletStr, newBalance, bal, amt } = useWalletVals();
  const openPayMethod = () => router.push('/money/pay-method');

  const openMoneySuccess = () => {
    useApp.getState().set({ wallet: bal + amt });
    resetTo('/money/success');
  };
  /** Not wired in the prototype markup — long-press "Confirm" to preview the declined state. */
  const openMoneyFail = () => router.push('/money/failed');

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Confirm top-up" subtitle="Review before you pay" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <Card style={{ padding: 16, alignItems: 'center', gap: 6 }}>
          <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.6, color: C.muted2 }]}>
            ADDING TO WALLET
          </Txt>
          <Txt numberOfLines={1} style={[f(800, 34, 1), { color: C.forest, letterSpacing: -1 }]}>
            {amountStr}
          </Txt>
        </Card>

        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 11,
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: C.dividerSoft,
            }}>
            <IconBox>
              <CardGlyph />
            </IconBox>
            <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>
                Visa ending 4417
              </Txt>
              <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted2 }]}>
                Expires 09/28
              </Txt>
            </View>
            <Tap onPress={openPayMethod} hitSlop={8}>
              <Txt numberOfLines={1} style={[f(600, 11.5, 1), { color: C.green }]}>
                Change
              </Txt>
            </Tap>
          </View>
          <KV k="Current balance" v={`${walletStr}.00`} />
          <KV k="Amount added" v={`+ ${amountStr}`} weight={600} color={C.green} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, padding: 12, alignItems: 'baseline' }}>
            <Txt numberOfLines={1} style={f(700, 13, 1)}>
              New balance
            </Txt>
            <Txt numberOfLines={1} style={f(700, 17, 1)}>
              {newBalance}
            </Txt>
          </View>
        </Card>

        <SecureNote />
      </ScrollView>
      <Footer>
        <PrimaryButton tone="lime" label="Confirm & add money" onPress={openMoneySuccess} onLongPress={openMoneyFail} />
        <SecondaryButton label="Change payment method" onPress={openPayMethod} />
      </Footer>
    </Screen>
  );
}
