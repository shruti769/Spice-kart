import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Card, CardGlyph, Footer, IconBox, KV, PrimaryButton, SecondaryButton, SecureNote, useWalletVals } from '@/components/money/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { resetTo } from '@/lib/nav';
import { TopUpError, topUp } from '@/lib/remote-wallet';
import { useApp, useTopUpMethod } from '@/store/app-store';

/** Review the top-up before paying (prototype `sMoneyConfirm`). */
export default function MoneyConfirmScreen() {
  const { amountStr, walletStr, newBalance, amt, amtErr } = useWalletVals();
  const openPayMethod = () => router.push('/money/pay-method');
  const method = useTopUpMethod();
  const [adding, setAdding] = useState(false);

  // Credited on the server (demo: nothing is charged until a payment provider is connected).
  const addMoney = async () => {
    if (adding) return;
    if (amtErr) return useApp.getState().flash('Enter an amount between $5 and $500');
    setAdding(true);
    try {
      await topUp(amt, method.short);
      resetTo('/money/success');
    } catch (e) {
      useApp.getState().flash(e instanceof TopUpError ? e.message : 'Couldn’t add money. Please try again');
    } finally {
      setAdding(false);
    }
  };

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
                {method.title}
              </Txt>
              <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted2 }]}>
                {method.sub}
              </Txt>
            </View>
            <Tap onPress={openPayMethod} hitSlop={8}>
              <Txt numberOfLines={1} style={[f(600, 11.5, 1), { color: C.green }]}>
                Change
              </Txt>
            </Tap>
          </View>
          <KV k="Current balance" v={walletStr} />
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
        <PrimaryButton tone="lime" label={adding ? 'Adding money…' : 'Confirm & add money'} onPress={addMoney} />
        <SecondaryButton label="Change payment method" onPress={openPayMethod} />
      </Footer>
    </Screen>
  );
}
