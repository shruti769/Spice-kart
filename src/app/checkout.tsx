import { router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BackIcon } from '@/components/icons';
import { Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { money } from '@/data/catalog';
import { goBack, resetTo } from '@/lib/nav';
import { refreshCatalog } from '@/lib/remote-catalog';
import { refreshConfig, useStoreConfig } from '@/lib/remote-config';
import { findBookableSlot, refreshDelivery, scheduledLabel, slotFee, useDeliverySettings, useScheduleDays, windowLabel } from '@/lib/remote-delivery';
import { getDeviceFix, type DeviceFix } from '@/lib/location';
import { OrderError, placeOrder as submitOrder } from '@/lib/remote-orders';
import { deliversTo, postcodeOf } from '@/lib/remote-postcodes';
import { refreshWallet } from '@/lib/remote-wallet';
import { brandName, useAddress, useApp, useDefaultCard, useTotals, type PaymentKey } from '@/store/app-store';

const LIME = C.lime;
const OFF_BORDER = C.borderCard;
const layout = LinearTransition.duration(220);

const PAY_DEFS: [PaymentKey, string, string][] = [
  ['Card', 'Credit / debit card', 'Visa ending 4417'],
  ['Apple Pay', 'Apple Pay', 'Fastest checkout'],
  ['Google Pay', 'Google Pay', 'Linked to your account'],
  ['PayID', 'PayID bank transfer', 'Pay from your bank app'],
  ['Spice Kart Money', 'Spice Kart Money', ''],
];

/** The admin switches card / wallets / PayID on and off; Spice Kart Money is always offered. */
const offered = (key: PaymentKey, methods: PaymentKey[]) => key === 'Spice Kart Money' || methods.includes(key);

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

/** Explain a rejected order and refresh whatever was out of date (stock, slots). */
function orderFailed(e: OrderError) {
  const s = useApp.getState();
  switch (e.code) {
    case 'out_of_stock':
      refreshCatalog();
      return s.flash((e.detail || 'An item') + ' is out of stock · update your cart');
    case 'product_unavailable':
      refreshCatalog();
      return s.flash('An item in your cart is no longer available');
    case 'slot_full':
    case 'slot_unavailable':
      refreshDelivery();
      s.set({ slot: null, scheduling: true });
      return s.flash(e.code === 'slot_full' ? 'That window is fully booked · pick another' : 'That window is no longer available · pick another');
    case 'not_deliverable':
      return s.flash(`Sorry, we don’t deliver to ${e.detail || 'this address'} yet · change the address`);
    case 'empty_cart':
      return s.flash('Your cart is empty');
    case 'below_minimum':
      refreshConfig();
      return s.flash(`Minimum order is $${Number(e.detail || 0).toFixed(2)} · add a few more items`);
    case 'payment_method_unavailable':
      refreshConfig();
      return s.flash(`${s.payment} isn’t available right now · choose another payment method`);
    case 'store_closed':
      refreshConfig();
      // Express only runs in store hours; a scheduled window still works.
      s.set({ slot: null, scheduling: true });
      return s.flash('We’re closed for express delivery right now · schedule a delivery instead');
    case 'insufficient_balance':
      refreshWallet();
      return s.flash('Not enough Spice Kart Money · add money or choose another payment method');
    case 'account_suspended':
      return s.flash('Your account can’t place orders right now · please contact support');
    case 'no_store':
      return s.flash('We’re not taking orders right now · please try again later');
    default:
      return s.flash("Couldn't place your order. Please try again.");
  }
}

export default function CheckoutScreen() {
  const pad = usePad();
  const t = useTotals();
  const coupon = useApp((s) => s.coupon);
  const slot = useApp((s) => s.slot);
  const schDay = useApp((s) => s.schDay);
  const scheduling = useApp((s) => s.scheduling);
  const delivery = useDeliverySettings();
  const days = useScheduleDays();
  // The picked day, or the first bookable one.
  const day = days.find((d) => d.date === schDay) ?? days[0];
  const payment = useApp((s) => s.payment);
  const card = useDefaultCard();
  const set = useApp((s) => s.set);
  const balance = useApp((s) => s.wallet) ?? 0;

  const addr = useAddress();
  const express = slot === 'ASAP' && !scheduling;
  const schSub = slot && slot !== 'ASAP' && schDay ? scheduledLabel(slot, schDay) : 'Choose a delivery time that works for you';
  const total = money(t.total);

  const [placing, setPlacing] = useState(false);
  // Admin → Settings: opening hours, minimum order, payment methods switched on.
  const config = useStoreConfig();
  const payDefs = PAY_DEFS.filter(([key]) => offered(key, config.paymentMethods));
  const short = config.minOrder > 0 && t.sub < config.minOrder ? config.minOrder - t.sub : 0;
  const closedNote = 'Closed' + (config.opens ? ' · ' + config.opens : '');

  // Express only runs in store hours: switch to scheduling while closed.
  useEffect(() => {
    if (!config.open && useApp.getState().slot === 'ASAP') useApp.getState().set({ slot: null, scheduling: true });
  }, [config.open]);
  // A payment method the admin switched off falls back to the first one still on.
  useEffect(() => {
    const p = useApp.getState().payment;
    if (config.paymentMethods.length && !offered(p, config.paymentMethods)) useApp.getState().set({ payment: config.paymentMethods[0] });
  }, [config.paymentMethods]);

  // Where the phone is, recorded with the order (asks for permission once; the order never waits on it).
  const device = useRef<DeviceFix | null>(null);
  useEffect(() => {
    getDeviceFix({ ask: true, timeoutMs: 8_000 }).then((r) => {
      if (r.ok) device.current = r.fix;
    });
  }, []);

  const placeOrder = async () => {
    if (placing) return;
    const s = useApp.getState();
    if (short > 0) {
      s.flash(`Add ${money(short)} more to reach the ${money(config.minOrder)} minimum order`);
      return;
    }
    if (!offered(s.payment, config.paymentMethods)) {
      s.flash(`${s.payment} isn’t available right now · choose another payment method`);
      return;
    }
    if (s.payment === 'Spice Kart Money' && (s.wallet ?? 0) < t.total) {
      s.flash(`Not enough Spice Kart Money (${money(s.wallet ?? 0)}) · add money or choose another payment method`);
      return;
    }
    if (s.slot === 'ASAP' && !config.open) {
      s.set({ slot: null, scheduling: true });
      s.flash('We’re closed for express delivery right now · schedule a delivery instead');
      return;
    }
    if (s.slot !== 'ASAP') {
      if (!s.slot || !s.schDay) {
        s.set({ scheduling: true });
        s.flash('Pick a delivery window');
        return;
      }
      // The window may have passed its cut-off (or been closed) since it was picked.
      if (!findBookableSlot(s.slot, s.schDay)) {
        s.set({ slot: null, scheduling: true });
        s.flash('That window is no longer available · pick another');
        return;
      }
    }
    const address = s.addresses[s.addr] ?? s.addresses[0];
    const postcode = postcodeOf(address.line);
    if (!deliversTo(postcode)) {
      s.flash(`Sorry, we don’t deliver to ${postcode || 'this address'} yet · change the address`);
      return;
    }
    setPlacing(true);
    try {
      const placed = await submitOrder({
        cart: s.cart,
        address,
        payment: s.payment,
        slotId: s.slot === 'ASAP' ? null : s.slot,
        date: s.schDay || null,
        coupon: s.coupon,
        device: device.current,
      });
      s.placeOrder(placed);
      if (s.payment === 'Spice Kart Money') refreshWallet();
      resetTo('/order-confirmed');
    } catch (e) {
      orderFailed(e instanceof OrderError ? e : new OrderError('network'));
    } finally {
      setPlacing(false);
    }
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
          <Tap
            onPress={() => (config.open ? set({ slot: 'ASAP', scheduling: false }) : useApp.getState().flash('Express delivery is ' + closedNote.toLowerCase() + ' · schedule a delivery instead'))}
            style={[styles.option, sel(express), !config.open && { opacity: 0.6 }]}>
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
              {config.open ? (
                <Txt numberOfLines={1} style={[f(600, 12.5, 1.3), { color: C.green }]}>Arrives in {delivery.etaMinutes} minutes</Txt>
              ) : (
                <Txt numberOfLines={1} style={[f(600, 12.5, 1.3), { color: C.danger }]}>{closedNote}</Txt>
              )}
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
              {day ? (
                <>
                  <Txt numberOfLines={1} style={styles.panelLabel}>CHOOSE A DAY</Txt>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days}>
                    {days.map((d) => {
                      const on = d.date === day.date;
                      return (
                        <Tap key={d.date} onPress={() => set({ schDay: d.date })} style={[styles.day, on && styles.chipOn]}>
                          <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={f(600, 12.5, 1.2)}>{d.label}</Txt>
                          <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted2 }]}>{d.sub}</Txt>
                        </Tap>
                      );
                    })}
                  </ScrollView>
                  <Txt numberOfLines={1} style={[styles.panelLabel, { marginTop: 4 }]}>AVAILABLE WINDOWS</Txt>
                  <Grid
                    data={day.slots}
                    columns={2}
                    gap={8}
                    keyOf={(w) => w.id}
                    renderItem={(w) => {
                      const on = slot === w.id && schDay === day.date;
                      // Free when the order already qualifies for free delivery.
                      const fee = t.sub >= t.freeOver ? 0 : slotFee(w, delivery);
                      return (
                        <Tap onPress={() => set({ slot: w.id, schDay: day.date, scheduling: false })} style={[styles.window, on && styles.chipOn]}>
                          <Txt numberOfLines={1} style={f(600, 14, 1.25)}>{windowLabel(w)}</Txt>
                          <Txt numberOfLines={1} style={[f(500, 9.5, 1.2), { color: fee === 0 ? C.green : C.muted2 }]}>{fee === 0 ? 'Free' : money(fee)}</Txt>
                        </Tap>
                      );
                    }}
                  />
                </>
              ) : (
                <Txt style={[f(400, 12.5, 1.4), { color: C.muted }]}>No delivery windows are open right now. Choose express delivery or check back later.</Txt>
              )}
            </Animated.View>
          )}
        </Animated.View>

        {/* Payment method */}
        <Animated.View layout={layout} style={[styles.card, { gap: 10 }]}>
          <Txt style={f(700, 14, 1.25)}>Payment method</Txt>
          {payDefs.map(([key, label, fixedSub]) => {
            const sub =
              key === 'Card'
                ? brandName(card) + ' ending ' + card.last4
                : key === 'Spice Kart Money'
                  ? 'Balance ' + money(balance) + (balance < t.total ? ' · not enough' : '')
                  : fixedSub;
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
          {short > 0 && (
            <Txt style={[f(500, 12, 1.4), { color: C.danger }]}>
              Add {money(short)} more to reach the {money(config.minOrder)} minimum order
            </Txt>
          )}
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
          <Txt style={[f(700, 16, 1.2), { color: C.forest }]}>{placing ? 'Placing order…' : 'Place order'}</Txt>
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
