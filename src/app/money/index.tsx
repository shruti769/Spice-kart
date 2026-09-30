import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ChevronRight } from '@/components/icons';
import { Card, CardGlyph, Footer, IconBox, PrimaryButton, SectionLabel, useWalletVals } from '@/components/money/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Grad, Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useWalletStore, type WalletTx } from '@/lib/remote-wallet';
import { brandName, useApp, useDefaultCard } from '@/store/app-store';

const PRESETS = [10, 25, 50, 100];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** One activity row: title, "1 Sep · Visa · 4417", "+ $50.00" and its colour. */
function txRow(t: WalletTx): [id: number, label: string, date: string, amount: string, color: string] {
  const d = new Date(t.createdAt);
  const label =
    t.kind === 'topup' ? 'Added money' : t.kind === 'refund' ? 'Refund' : t.kind === 'adjustment' ? (t.amount > 0 ? 'Credit from Spice Kart' : 'Adjustment') : t.note || 'Order';
  const detail = t.kind === 'topup' ? t.method : t.kind === 'order_payment' ? 'Paid for groceries' : t.note.replace(/^Refund · /, '');
  const sign = t.amount > 0 ? '+ ' : '− ';
  return [t.id, label, [d.getDate() + ' ' + MONTHS[d.getMonth()], detail].filter(Boolean).join(' · '), sign + '$' + Math.abs(t.amount).toFixed(2), t.amount > 0 ? '#0B7A32' : '#1F1F1F'];
}

/** Spice Kart Money wallet (prototype `sMoney`). */
export default function MoneyScreen() {
  const { walletStr, amountStr, amountText } = useWalletVals();
  const set = useApp((s) => s.set);
  const card = useDefaultCard();
  const { transactions, loaded } = useWalletStore();

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Spice Kart Money" subtitle="Wallet · AUD" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        {/* Balance card */}
        <View style={{ borderRadius: 16, boxShadow: '0 10px 24px rgba(11,61,31,0.2)' }}>
          <Grad preset="wallet" style={{ borderRadius: 16, padding: 16, gap: 12, overflow: 'hidden' }}>
            <View
              style={{
                position: 'absolute',
                right: -30,
                top: -30,
                width: 130,
                height: 130,
                borderRadius: 65,
                backgroundColor: 'rgba(139,224,0,0.14)',
              }}
            />
            <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.7, color: 'rgba(255,255,255,0.62)' }]}>
              AVAILABLE BALANCE
            </Txt>
            <Txt numberOfLines={1} style={[f(800, 32, 1), { color: '#fff', letterSpacing: -0.8 }]}>
              {walletStr}
            </Txt>
            <Txt style={[f(400, 10.5, 1.5), { color: 'rgba(255,255,255,0.62)' }]}>
              Use at checkout on any order. Refunds and cashback land here instantly.
            </Txt>
          </Grad>
        </View>

        {/* Add money */}
        <View style={{ gap: 8 }}>
          <SectionLabel>ADD MONEY</SectionLabel>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {PRESETS.map((v) => {
              const on = String(v) === amountText;
              return (
                <Tap
                  key={v}
                  onPress={() => set({ amountText: String(v) })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={{
                    flex: 1,
                    height: 44,
                    borderWidth: 1,
                    borderColor: on ? C.lime : C.border,
                    backgroundColor: on ? C.selectedBgAlt : '#fff',
                    borderRadius: 11,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Txt style={[f(700, 13, 1), { color: C.forest }]}>${v}</Txt>
                </Tap>
              );
            })}
          </View>
          <Tap
            onPress={() => router.push('/money/amount')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              height: 46,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: '#C7C7C1',
              borderRadius: 11,
              backgroundColor: '#fff',
            }}
            pressedStyle={{ borderColor: C.lime }}>
            <Txt style={[f(600, 13, 1), { color: C.muted2 }]}>Enter a custom amount</Txt>
            <Txt numberOfLines={1} style={[f(600, 11.5, 1), { marginLeft: 'auto', color: C.green }]}>
              Enter →
            </Txt>
          </Tap>
        </View>

        {/* Paying with */}
        <View style={{ gap: 7 }}>
          <SectionLabel>PAYING WITH</SectionLabel>
          <Card>
            <Tap
              onPress={() => router.push('/money/pay-method')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
                borderBottomWidth: 1,
                borderBottomColor: C.dividerSoft,
                paddingVertical: 11,
                paddingHorizontal: 12,
              }}
              pressedStyle={{ backgroundColor: '#FAFBF7' }}>
              <IconBox>
                <CardGlyph />
              </IconBox>
              <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
                <Txt numberOfLines={1} style={f(500, 12.5, 1.2)}>
                  {brandName(card) + ' · ' + card.last4}
                </Txt>
                <Txt style={[f(400, 10.5, 1.3), { color: C.muted2 }]}>Expires {card.exp}</Txt>
              </View>
              <Txt numberOfLines={1} style={[f(400, 11, 1), { color: C.muted2 }]}>
                Default
              </Txt>
              <ChevronRight />
            </Tap>
          </Card>
        </View>

        {/* Recent activity */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <SectionLabel>RECENT ACTIVITY</SectionLabel>
            <Txt numberOfLines={1} style={[f(400, 10.5, 1), { color: C.muted3 }]}>
              Latest first
            </Txt>
          </View>
          <Card>
            {transactions.length === 0 && (
              <Txt style={[f(400, 12, 1.4), { color: C.muted2, padding: 12 }]}>
                {loaded ? 'No activity yet. Top-ups, payments and refunds show up here.' : 'Loading…'}
              </Txt>
            )}
            {transactions.map(txRow).map(([id, label, date, amount, color]) => (
              <View
                key={id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: C.dividerSoft,
                }}>
                <IconBox>
                  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
                    <Circle cx={10} cy={10} r={7.2} stroke="#3F3F3B" strokeWidth={1.4} />
                    <Path d="M10 6.6v6.8M7.2 10h5.6" stroke="#3F3F3B" strokeWidth={1.4} strokeLinecap="round" />
                  </Svg>
                </IconBox>
                <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
                  <Txt numberOfLines={1} style={f(500, 12.5, 1.2)}>
                    {label}
                  </Txt>
                  <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted2 }]}>
                    {date}
                  </Txt>
                </View>
                <Txt numberOfLines={1} style={[f(700, 12.5, 1), { color }]}>
                  {amount}
                </Txt>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
      <Footer>
        <PrimaryButton tone="lime" label={`Add ${amountStr}`} onPress={() => router.push('/money/pay-method')} />
      </Footer>
    </Screen>
  );
}
