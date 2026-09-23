import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { SCH_DAYS, SCH_WINDOWS, windowLabel } from '@/components/checkout/slot';
import { ScreenHeader } from '@/components/screen-header';
import { Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { ADDRESSES, ETA_MINUTES, money } from '@/data/catalog';
import { resetTo } from '@/lib/nav';
import { useApp, useTotals, type PaymentKey } from '@/store/app-store';

const LIME = C.lime;
const OFF_BORDER = 'rgba(12,43,26,0.10)';
const layout = LinearTransition.duration(220);

const PAY_DEFS: [PaymentKey, string, string][] = [
  ['Card', 'Credit / debit card', 'Visa ending 4417'],
  ['Apple Pay', 'Apple Pay', 'Fastest checkout'],
  ['Google Pay', 'Google Pay', 'Linked to your account'],
  ['PayID', 'PayID bank transfer', 'Pay from your bank app'],
];

const sel = (on: boolean) => ({
  border: on ? LIME : OFF_BORDER,
  bg: on ? C.selectedBg : '#fff',
  dot: on ? LIME : C.radioOff,
  fill: on ? LIME : 'transparent',
});

const card = {
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: C.borderCard,
  borderRadius: 12,
  padding: 12,
  ...cardShadow,
} as const;

function IconBox({ children }: { children: ReactNode }) {
  return (
    <View style={{ width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: '#D9D9D4', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {children}
    </View>
  );
}

function Radio({ size, border, fill }: { size: number; border: string; fill: string }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: border, backgroundColor: fill, flexShrink: 0 }} />;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14 }}>
      <Txt numberOfLines={1} style={[f(400, 12, 1.3), { color: '#6E6E68' }]}>{label}</Txt>
      <Txt numberOfLines={1} style={[f(500, 12, 1.3), { color: C.ink }]}>{value}</Txt>
    </View>
  );
}

export default function CheckoutScreen() {
  const pad = usePad();
  const t = useTotals();
  const addrIdx = useApp((s) => s.addr);
  const slot = useApp((s) => s.slot);
  const schDay = useApp((s) => s.schDay) || 'Today';
  const scheduling = useApp((s) => s.scheduling);
  const payment = useApp((s) => s.payment);
  const set = useApp((s) => s.set);

  const addr = ADDRESSES[addrIdx] ?? ADDRESSES[0];
  const exp = sel(slot === 'ASAP');
  const sch = sel(slot !== 'ASAP');
  const schSub = slot && slot !== 'ASAP' ? schDay + ' · ' + windowLabel(slot) : 'Choose a delivery time that works for you';
  const total = money(t.total);

  const placeOrder = () => {
    useApp.getState().placeOrder();
    resetTo('/order-confirmed');
  };

  return (
    <Screen>
      <ScreenHeader title="Checkout" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 10 }}
        showsVerticalScrollIndicator={false}>
        {/* Delivery address */}
        <Animated.View layout={layout} style={[card, { gap: 9 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Txt numberOfLines={1} style={f(700, 12.5, 1)}>Delivery address</Txt>
            <Tap onPress={() => router.push('/location')} hitSlop={8} style={{ marginLeft: 'auto' }}>
              <Txt style={[f(600, 11.5, 1), { color: C.green }]}>Change</Txt>
            </Tap>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Svg width={16} height={16} viewBox="0 0 20 20" fill="none" style={{ marginTop: 2, flexShrink: 0 }}>
              <Path d="M10 18s6-5.2 6-9.5A6 6 0 004 8.5C4 12.8 10 18 10 18z" stroke="#6E6E68" strokeWidth={1.6} />
              <Circle cx={10} cy={8.5} r={2} fill={LIME} />
            </Svg>
            <View style={{ gap: 3, flexShrink: 1 }}>
              <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>{addr.label + ' • Melbourne VIC'}</Txt>
              <Txt style={[f(400, 12, 1.45), { color: C.muted }]}>{addr.line}</Txt>
            </View>
          </View>
        </Animated.View>

        {/* Delivery time */}
        <Animated.View layout={layout} style={[card, { gap: 8 }]}>
          <Txt style={f(700, 12.5, 1)}>Delivery time</Txt>
          <Tap
            onPress={() => set({ slot: 'ASAP', scheduling: false })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: exp.border, backgroundColor: exp.bg, borderRadius: 10, padding: 11 }}>
            <IconBox>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M2.5 7.5h10v9h-10v-9z" stroke={C.ink2} strokeWidth={1.5} strokeLinejoin="round" />
                <Path d="M12.5 10.5H17l3 3v3h-7.5v-6z" stroke={C.ink2} strokeWidth={1.5} strokeLinejoin="round" />
                <Circle cx={6.5} cy={18} r={1.6} stroke={C.ink2} strokeWidth={1.5} />
                <Circle cx={16} cy={18} r={1.6} stroke={C.ink2} strokeWidth={1.5} />
              </Svg>
            </IconBox>
            <View style={{ gap: 3, minWidth: 0, flexShrink: 1 }}>
              <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>Express delivery</Txt>
              <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted }]}>Get your order as soon as possible</Txt>
              <Txt numberOfLines={1} style={[f(600, 10.5, 1.2), { color: C.green }]}>Arrives in {ETA_MINUTES} minutes</Txt>
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <Radio size={18} border={exp.dot} fill={exp.fill} />
            </View>
          </Tap>
          <Tap
            onPress={() => set({ scheduling: true, slot: slot === 'ASAP' ? null : slot })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: sch.border, backgroundColor: sch.bg, borderRadius: 10, padding: 11 }}>
            <IconBox>
              <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
                <Rect x={3.2} y={4.6} width={13.6} height={12.2} rx={2} stroke={C.ink2} strokeWidth={1.5} />
                <Path d="M3.2 8h13.6M7 3.2v2.6M13 3.2v2.6" stroke={C.ink2} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            </IconBox>
            <View style={{ gap: 3, minWidth: 0, flexShrink: 1 }}>
              <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>Schedule</Txt>
              <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted }]}>{schSub}</Txt>
            </View>
            <View style={{ marginLeft: 'auto' }}>
              <Radio size={18} border={sch.dot} fill={sch.fill} />
            </View>
          </Tap>

          {scheduling && (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(120)}
              layout={layout}
              style={{ gap: 9, padding: 11, borderRadius: 10, backgroundColor: '#FAFBF7', borderWidth: 1, borderColor: C.borderCard }}>
              <Txt numberOfLines={1} style={[f(600, 10, 1), { letterSpacing: 0.5, color: C.muted2 }]}>CHOOSE A DAY</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
                {SCH_DAYS.map(([label, sub]) => {
                  const on = schDay === label;
                  return (
                    <Tap
                      key={label}
                      onPress={() => set({ schDay: label })}
                      style={{
                        flexShrink: 0,
                        alignItems: 'center',
                        gap: 3,
                        minWidth: 74,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        borderWidth: 1,
                        borderColor: on ? LIME : C.border,
                        backgroundColor: on ? C.selectedBgAlt : '#fff',
                        borderRadius: 9,
                      }}>
                      <Txt numberOfLines={1} style={[f(600, 11.5, 1.2), { color: C.ink }]}>{label}</Txt>
                      <Txt numberOfLines={1} style={[f(400, 9.5, 1.2), { color: C.muted2 }]}>{sub}</Txt>
                    </Tap>
                  );
                })}
              </ScrollView>
              <Txt numberOfLines={1} style={[f(600, 10, 1), { letterSpacing: 0.5, color: C.muted2 }]}>AVAILABLE WINDOWS</Txt>
              <Grid
                data={SCH_WINDOWS}
                columns={2}
                gap={7}
                keyOf={(w) => w[0]}
                renderItem={([key, label, fee]) => {
                  const on = slot === key;
                  return (
                    <Tap
                      onPress={() => set({ slot: key, scheduling: false })}
                      style={{
                        gap: 3,
                        paddingVertical: 9,
                        paddingHorizontal: 10,
                        borderWidth: 1,
                        borderColor: on ? LIME : C.border,
                        backgroundColor: on ? C.selectedBgAlt : '#fff',
                        borderRadius: 9,
                      }}>
                      <Txt numberOfLines={1} style={[f(600, 11.5, 1.2), { color: C.ink }]}>{label}</Txt>
                      <Txt numberOfLines={1} style={[f(500, 9.5, 1.2), { color: fee === 'Free' ? C.green : C.muted2 }]}>{fee}</Txt>
                    </Tap>
                  );
                }}
              />
            </Animated.View>
          )}
        </Animated.View>

        {/* Payment method */}
        <Animated.View layout={layout} style={[card, { gap: 8 }]}>
          <Txt style={f(700, 12.5, 1)}>Payment method</Txt>
          {PAY_DEFS.map(([key, label, sub]) => {
            const m = sel(payment === key);
            return (
              <Tap
                key={key}
                onPress={() => set({ payment: key })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: m.border, backgroundColor: m.bg, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 11 }}>
                <Radio size={16} border={m.dot} fill={m.fill} />
                <View style={{ gap: 2, flexShrink: 1 }}>
                  <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>{label}</Txt>
                  <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted }]}>{sub}</Txt>
                </View>
              </Tap>
            );
          })}
        </Animated.View>

        {/* Order summary */}
        <Animated.View layout={layout} style={[card, { gap: 9 }]}>
          <Txt style={f(700, 12.5, 1)}>Order summary</Txt>
          <SummaryRow label={t.n + (t.n === 1 ? ' item' : ' items')} value={money(t.sub)} />
          <SummaryRow label="Delivery fee" value={t.delivery === 0 ? 'FREE' : money(t.delivery)} />
          <SummaryRow label="Handling fee" value={money(t.service)} />
          <View style={{ height: 1, backgroundColor: C.divider }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Txt style={f(700, 13, 1)}>To pay</Txt>
            <Txt style={f(700, 16, 1)}>{total}</Txt>
          </View>
        </Animated.View>
      </ScrollView>

      <View
        style={{
          paddingTop: 10,
          paddingHorizontal: 14,
          paddingBottom: pad.bottom(30),
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: C.divider,
          boxShadow: '0 -6px 18px rgba(16,24,16,0.05)',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}>
        <View style={{ gap: 2 }}>
          <Txt style={f(700, 14.5, 1)}>{total}</Txt>
          <Txt style={[f(400, 10.5, 1), { color: C.muted }]}>{payment}</Txt>
        </View>
        <Tap
          onPress={placeOrder}
          pressedStyle={{ backgroundColor: C.limeHover }}
          style={{ flex: 1, height: 46, borderRadius: 11, backgroundColor: LIME, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(107,176,0,0.24)' }}>
          <Txt style={[f(700, 14, 1), { color: C.forest }]}>Place order</Txt>
        </Tap>
      </View>
    </Screen>
  );
}
