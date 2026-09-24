import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { SCH_DAYS, SCH_WINDOWS, windowLabel } from '@/components/checkout/slot';
import { BackIcon } from '@/components/icons';
import { Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { ETA_MINUTES, money } from '@/data/catalog';
import { goBack, resetTo } from '@/lib/nav';
import { brandName, useAddress, useApp, useDefaultCard, useTotals, type PaymentKey } from '@/store/app-store';

const LIME = C.lime;
const OFF_BORDER = C.borderCard;
const layout = LinearTransition.duration(220);

const PAY_DEFS: [PaymentKey, string, string][] = [
  ['Card', 'Credit / debit card', 'Visa ending 4417'],
  ['Apple Pay', 'Apple Pay', 'Fastest checkout'],
  ['Google Pay', 'Google Pay', 'Linked to your account'],
  ['PayID', 'PayID bank transfer', 'Pay from your bank app'],
];

const sel = (on: boolean) => ({ borderColor: on ? LIME : OFF_BORDER, backgroundColor: on ? C.selectedBg : '#fff' });

function IconBox({ children }: { children: ReactNode }) {
  return <View style={styles.iconBox}>{children}</View>;
}

/** Selected: lime rounded square. Unselected: grey ring (as in the design). */
function Radio({ on, size }: { on: boolean; size: number }) {
  return on ? (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: LIME, flexShrink: 0 }} />
  ) : (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#D6DDD6', flexShrink: 0 }} />
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Txt numberOfLines={1} style={[f(400, 13.5, 1.3), { color: '#6E6E68' }]}>{label}</Txt>
      <Txt numberOfLines={1} style={[f(500, 13.5, 1.3), { color: C.ink }]}>{value}</Txt>
    </View>
  );
}

export default function CheckoutScreen() {
  const pad = usePad();
  const t = useTotals();
  const coupon = useApp((s) => s.coupon);
  const slot = useApp((s) => s.slot);
  const schDay = useApp((s) => s.schDay) || 'Today';
  const scheduling = useApp((s) => s.scheduling);
  const payment = useApp((s) => s.payment);
  const card = useDefaultCard();
  const set = useApp((s) => s.set);

  const addr = useAddress();
  const express = slot === 'ASAP' && !scheduling;
  const schSub = slot && slot !== 'ASAP' ? schDay + ' · ' + windowLabel(slot) : 'Choose a delivery time that works for you';
  const total = money(t.total);

  const placeOrder = () => {
    useApp.getState().placeOrder();
    resetTo('/order-confirmed');
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: pad.top(54) }]}>
        <Tap accessibilityLabel="Back" onPress={goBack} hitSlop={8} style={styles.back}>
          <BackIcon size={18} />
        </Tap>
        <Txt numberOfLines={1} style={f(700, 17, 1.2)}>Checkout</Txt>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery address */}
        <Animated.View layout={layout} style={[styles.card, { gap: 10 }]}>
          <View style={styles.row}>
            <Txt numberOfLines={1} style={f(700, 14, 1.25)}>Delivery address</Txt>
            <Tap onPress={() => router.push('/location')} hitSlop={8} style={{ marginLeft: 'auto', marginRight: 7 }}>
              <Txt style={[f(600, 14, 1.25), { color: C.green }]}>Change</Txt>
            </Tap>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Svg width={14} height={16} viewBox="0 0 20 22" fill="none" style={{ marginTop: 2, marginLeft: 1, flexShrink: 0 }}>
              <Path d="M10 20s7-6.1 7-11.1A7 7 0 003 8.9C3 13.9 10 20 10 20z" stroke="#6E6E68" strokeWidth={1.7} />
              <Circle cx={10} cy={9} r={2.3} fill={LIME} />
            </Svg>
            <View style={{ gap: 4, flexShrink: 1 }}>
              <Txt numberOfLines={1} style={f(600, 14, 1.25)}>{addr.label + ' • ' + addr.area}</Txt>
              <Txt style={[f(400, 13, 1.35), { color: C.muted }]}>{addr.line}</Txt>
            </View>
          </View>
        </Animated.View>

        {/* Delivery time */}
        <Animated.View layout={layout} style={[styles.card, { gap: 10 }]}>
          <Txt style={f(700, 14, 1.25)}>Delivery time</Txt>
          <Tap onPress={() => set({ slot: 'ASAP', scheduling: false })} style={[styles.option, sel(express)]}>
            <IconBox>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M2.5 7.5h10v9h-10v-9z" stroke={C.ink2} strokeWidth={1.5} strokeLinejoin="round" />
                <Path d="M12.5 10.5H17l3 3v3h-7.5v-6z" stroke={C.ink2} strokeWidth={1.5} strokeLinejoin="round" />
                <Circle cx={6.5} cy={18} r={1.6} stroke={C.ink2} strokeWidth={1.5} />
                <Circle cx={16} cy={18} r={1.6} stroke={C.ink2} strokeWidth={1.5} />
              </Svg>
            </IconBox>
            <View style={styles.optionText}>
              <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>Express delivery</Txt>
              <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(400, 11, 1.2), { color: C.muted }]}>Get your order as soon as possible</Txt>
              <Txt numberOfLines={1} style={[f(600, 12.5, 1.3), { color: C.green }]}>Arrives in {ETA_MINUTES} minutes</Txt>
            </View>
            <Radio on={express} size={22} />
          </Tap>
          <Tap onPress={() => set({ scheduling: true, slot: slot === 'ASAP' ? null : slot })} style={[styles.option, sel(!express)]}>
            <IconBox>
              <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
                <Rect x={3.2} y={4.6} width={13.6} height={12.2} rx={2} stroke={C.ink2} strokeWidth={1.5} />
                <Path d="M3.2 8h13.6M7 3.2v2.6M13 3.2v2.6" stroke={C.ink2} strokeWidth={1.5} strokeLinecap="round" />
              </Svg>
            </IconBox>
            <View style={styles.optionText}>
              <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>Schedule</Txt>
              <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(400, 11, 1.2), { color: C.muted }]}>{schSub}</Txt>
            </View>
            <Radio on={!express} size={22} />
          </Tap>

          {scheduling && (
            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} layout={layout} style={styles.schedule}>
              <Txt numberOfLines={1} style={styles.panelLabel}>CHOOSE A DAY</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                {SCH_DAYS.map(([label, sub]) => {
                  const on = schDay === label;
                  return (
                    <Tap key={label} onPress={() => set({ schDay: label })} style={[styles.day, on && styles.chipOn]}>
                      <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={f(600, 12.5, 1.2)}>{label}</Txt>
                      <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted2 }]}>{sub}</Txt>
                    </Tap>
                  );
                })}
              </ScrollView>
              <Txt numberOfLines={1} style={[styles.panelLabel, { marginTop: 4 }]}>AVAILABLE WINDOWS</Txt>
              <Grid
                data={SCH_WINDOWS}
                columns={2}
                gap={8}
                keyOf={(w) => w[0]}
                renderItem={([key, label, fee]) => {
                  const on = slot === key;
                  return (
                    <Tap onPress={() => set({ slot: key, scheduling: false })} style={[styles.window, on && styles.chipOn]}>
                      <Txt numberOfLines={1} style={f(600, 14, 1.25)}>{label}</Txt>
                      <Txt numberOfLines={1} style={[f(500, 9.5, 1.2), { color: fee === 'Free' ? C.green : C.muted2 }]}>{fee}</Txt>
                    </Tap>
                  );
                }}
              />
            </Animated.View>
          )}
        </Animated.View>

        {/* Payment method */}
        <Animated.View layout={layout} style={[styles.card, { gap: 10 }]}>
          <Txt style={f(700, 14, 1.25)}>Payment method</Txt>
          {PAY_DEFS.map(([key, label, fixedSub]) => {
            const sub = key === 'Card' ? brandName(card) + ' ending ' + card.last4 : fixedSub;
            const on = payment === key;
            return (
              <Tap key={key} onPress={() => set({ payment: key })} style={[styles.payOption, sel(on)]}>
                <Radio on={on} size={20} />
                <View style={{ gap: 2, flexShrink: 1 }}>
                  <Txt numberOfLines={1} style={f(600, 14, 1.25)}>{label}</Txt>
                  <Txt numberOfLines={1} style={[f(400, 13, 1.25), { color: C.muted }]}>{sub}</Txt>
                </View>
              </Tap>
            );
          })}
        </Animated.View>

        {/* Order summary */}
        <Animated.View layout={layout} style={[styles.card, { gap: 8 }]}>
          <Txt style={f(700, 14, 1.25)}>Order summary</Txt>
          <SummaryRow label={t.n + (t.n === 1 ? ' item' : ' items')} value={money(t.sub)} />
          <SummaryRow label="Delivery fee" value={t.delivery === 0 ? 'FREE' : money(t.delivery)} />
          <SummaryRow label="Handling fee" value={money(t.service)} />
          {t.discount > 0 && <SummaryRow label={'Coupon · ' + coupon} value={'− ' + money(t.discount)} />}
          <View style={{ height: 1, backgroundColor: C.divider, marginVertical: 2 }} />
          <View style={[styles.summaryRow, { alignItems: 'center' }]}>
            <Txt style={f(700, 14.5, 1.25)}>To pay</Txt>
            <Txt style={f(700, 18, 1.2)}>{total}</Txt>
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: pad.bottom(30) }]}>
        <View style={{ gap: 1 }}>
          <Txt style={f(700, 17, 1.2)}>{total}</Txt>
          <Txt style={[f(400, 12.5, 1.2), { color: C.muted }]}>{payment}</Txt>
        </View>
        <Tap onPress={placeOrder} pressedStyle={{ backgroundColor: C.limeHover }} style={styles.place}>
          <Txt style={[f(700, 16, 1.2), { color: C.forest }]}>Place order</Txt>
        </Tap>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 6, paddingBottom: 11, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider },
  back: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 14, paddingHorizontal: 10, paddingBottom: 20, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, padding: 12, ...cardShadow },

  iconBox: { width: 31, height: 31, borderRadius: 9, borderWidth: 1, borderColor: '#D9D9D4', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  option: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingLeft: 12, paddingRight: 12 },
  optionText: { gap: 3, minWidth: 0, flex: 1 },
  payOption: { minHeight: 53, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 11 },

  schedule: { gap: 8, padding: 12, borderRadius: 10, backgroundColor: '#FAFBF7', borderWidth: 1, borderColor: C.borderCard },
  panelLabel: { ...f(600, 11.5, 1.25), letterSpacing: 0.8, color: C.muted2 },
  days: { flexGrow: 1, flexDirection: 'row', gap: 7 },
  // Figma: ~78.6 × 45.8, min-width 74, radius 9, 0.8px border, padding 8/10, gap 3 (flex fills the row equally).
  day: { flex: 1, minWidth: 74, minHeight: 45.8, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 0.8, borderColor: C.border, backgroundColor: '#fff', borderRadius: 9 },
  // Figma: ~158.9 × 47.8 (2-column grid), radius 9, 0.8px border, padding 9/10, gap 3.
  window: { minHeight: 47.8, justifyContent: 'center', gap: 3, paddingVertical: 9, paddingHorizontal: 10, borderWidth: 0.8, borderColor: C.border, backgroundColor: '#fff', borderRadius: 9 },
  chipOn: { borderColor: LIME, backgroundColor: C.selectedBgAlt },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingTop: 18, paddingLeft: 14, paddingRight: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.divider, boxShadow: '0 -6px 18px rgba(16,24,16,0.05)' },
  place: { flex: 1, height: 46, borderRadius: 12, backgroundColor: LIME, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(107,176,0,0.24)' },
});
