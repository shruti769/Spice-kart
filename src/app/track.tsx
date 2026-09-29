import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BottomNav } from '@/components/bottom-nav';
import { Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { goTab } from '@/lib/nav';
import { useTrackedOrder, type OrderStatus, type TrackedOrder } from '@/lib/remote-orders';
import { useStore } from '@/lib/remote-store';
import { useApp } from '@/store/app-store';

const LIME = C.lime;
const SUPPORT_PHONE = '1800774235';

/** The normal flow; the admin moves an order along it (or cancels it). */
const FLOW: [Exclude<OrderStatus, 'cancelled'>, string][] = [
  ['placed', 'Order placed'],
  ['confirmed', 'Order confirmed'],
  ['picking', 'Picking your groceries'],
  ['packed', 'Packed'],
  ['out_for_delivery', 'Out for delivery'],
  ['delivered', 'Delivered'],
];

const HEADLINE: Record<OrderStatus, string> = {
  placed: 'We’ve received your order',
  confirmed: 'Your order is confirmed',
  picking: 'We’re picking your groceries',
  packed: 'Your order is packed',
  out_for_delivery: 'Your order is on the way',
  delivered: 'Delivered · enjoy!',
  cancelled: 'This order was cancelled',
};

/** "12:04 pm", or "Tue 12:04 pm" when it isn't today. */
function when(iso: string) {
  const d = new Date(iso);
  const t = d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? t : d.toLocaleDateString('en-AU', { weekday: 'short' }) + ' ' + t;
}

/** Index of the furthest step reached (for a cancelled order: the last step before cancelling). */
function currentStep(o: TrackedOrder) {
  if (o.status !== 'cancelled') return FLOW.findIndex(([k]) => k === o.status);
  let last = 0;
  FLOW.forEach(([k], i) => {
    if (o.reachedAt[k]) last = i;
  });
  return last;
}

/** Soft lime ring pulsing behind the active step dot. */
function Pulse() {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
  }, [v]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - v.value),
    transform: [{ scale: 1 + v.value * 0.9 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: 0, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: LIME }, style]}
    />
  );
}

function MapCard({ status, route }: { status: string; route: string }) {
  return (
    <View style={styles.map}>
      <Svg viewBox="0 0 367 200" style={StyleSheet.absoluteFill}>
        <Path d="M-10 58h387M-10 140h387M95 -10v220M263 -10v220" stroke="#F4F6F1" strokeWidth={8} />
        <Rect x={19} y={13} width={67} height={34} rx={4} fill="#E5E9DE" />
        <Rect x={114} y={13} width={130} height={34} rx={4} fill="#E5E9DE" />
        <Rect x={281} y={19} width={90} height={29} rx={4} fill="#E5E9DE" />
        <Rect x={16} y={155} width={62} height={28} rx={4} fill="#E5E9DE" />
        <Rect x={120} y={153} width={120} height={34} rx={4} fill="#E5E9DE" />
        <Rect x={278} y={157} width={94} height={31} rx={4} fill="#E5E9DE" />
        <Path d="M57 170 C 90 166, 100 124, 140 118 S 220 104, 263 85" stroke={LIME} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M263 85 C 290 76, 308 62, 328 44" stroke="#B9C6AC" strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray="8 7" />
        <Circle cx={57} cy={170} r={6} fill={C.greenDeep} />
        <Circle cx={263} cy={85} r={16} fill={LIME} fillOpacity={0.3} />
        <Circle cx={263} cy={85} r={9.5} fill="#fff" stroke={C.greenDeep} strokeWidth={3} />
        <Circle cx={328} cy={44} r={7} fill="#fff" stroke={C.greenDeep} strokeWidth={3} />
      </Svg>
      <View style={styles.mapPill}>
        <View style={styles.mapDot} />
        <Txt numberOfLines={1} style={[f(600, 12, 1.2), { color: C.greenDeep }]}>{status}</Txt>
      </View>
      <Txt numberOfLines={1} style={[f(500, 10, 1.2), styles.mapRoute]}>{route}</Txt>
      <View style={styles.zoomStack}>
        <View style={styles.zoom}>
          <Txt style={[f(600, 15, 1.2), { color: C.ink }]}>+</Txt>
        </View>
        <View style={styles.zoom}>
          <Txt style={[f(600, 15, 1.2), { color: C.ink }]}>−</Txt>
        </View>
      </View>
    </View>
  );
}

/** Live tracking for one order (`?id=`), or the customer's latest active order. */
export default function TrackScreen() {
  const pad = usePad();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { order, loading } = useTrackedOrder(id ?? null);

  return (
    <Screen style={{ backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: pad.top(53) }]}>
        <Txt numberOfLines={1} style={f(700, 17, 1.2)}>Track order</Txt>
        <Txt numberOfLines={1} style={[f(400, 12.5, 1.25), { color: C.muted }]}>
          {order ? 'Order #' + order.no : loading ? 'Loading…' : 'No active order'}
        </Txt>
      </View>
      {order ? (
        <Tracking order={order} />
      ) : (
        <View style={styles.empty}>
          {!loading && (
            <>
              <Txt style={[f(700, 15.5, 1.3), { textAlign: 'center' }]}>No order to track right now</Txt>
              <Txt style={[f(400, 12.5, 1.5), { color: C.muted, textAlign: 'center', maxWidth: 240 }]}>
                Orders you place show up here until they’re delivered.
              </Txt>
              <Tap onPress={() => goTab('orders')} style={styles.emptyBtn}>
                <Txt style={[f(600, 12.5, 1), { color: '#fff' }]}>View your orders</Txt>
              </Tap>
            </>
          )}
        </View>
      )}
      <BottomNav active="orders" showCartBar={false} />
    </Screen>
  );
}

function Tracking({ order }: { order: TrackedOrder }) {
  const cancelled = order.status === 'cancelled';
  const delivered = order.status === 'delivered';
  const cur = currentStep(order);
  const late = !cancelled && !delivered && !!order.promisedBy && new Date(order.promisedBy) < new Date();
  const street = order.addressLine.split(',')[0];
  // Name and phone exactly as the admin saved them (live), for this order's store.
  const store = useStore(order.storeId);
  const phone = store?.phone || SUPPORT_PHONE;

  const [etaLabel, etaValue] = cancelled
    ? ['ORDER CANCELLED', order.cancelReason || 'If you were charged, the refund is on its way']
    : delivered
      ? ['DELIVERED', order.deliveredAt ? when(order.deliveredAt) : 'Delivered']
      : order.deliveryType === 'scheduled'
        ? ['SCHEDULED DELIVERY', order.slotLabel ?? 'Scheduled delivery']
        : ['ESTIMATED ARRIVAL', order.promisedBy ? 'By ' + when(order.promisedBy) : 'Express delivery'];

  /** Time (or hint) under each step. */
  const sub = (k: Exclude<OrderStatus, 'cancelled'>, i: number) => {
    const at = order.reachedAt[k];
    if (at && i <= cur) return when(at);
    if (i <= cur) return 'Done';
    if (cancelled) return '—';
    if (k === 'delivered') return order.deliveryType === 'scheduled' ? order.slotLabel ?? 'Scheduled' : order.promisedBy ? 'Est. ' + when(order.promisedBy) : '—';
    return i === cur + 1 ? 'Next' : '—';
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <MapCard status={HEADLINE[order.status]} route={(store?.suburb || store?.name || 'Spice Kart') + ' → ' + street} />

      <View style={[styles.eta, cancelled && { backgroundColor: '#5A2A20' }]}>
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Txt style={[f(500, 12, 1.2), { letterSpacing: 0.8, color: 'rgba(255,255,255,0.6)' }]}>{etaLabel}</Txt>
          <Txt numberOfLines={1} style={[f(700, cancelled ? 14 : 17, 1.25), { color: '#fff' }]}>{etaValue}</Txt>
        </View>
        {!cancelled && (
          <Txt style={[f(600, 12.5, 1.2), { marginLeft: 'auto', color: late ? '#FFB4A2' : LIME }]}>{delivered ? 'DONE' : late ? 'RUNNING LATE' : 'ON TIME'}</Txt>
        )}
      </View>

      <View style={styles.steps}>
        {FLOW.map(([k, label], i) => {
          const done = i < cur || delivered;
          const reached = i <= cur;
          const active = i === cur && !delivered && !cancelled;
          const lastRow = i === FLOW.length - 1 && !cancelled;
          return (
            <View key={k} style={styles.step}>
              <View style={styles.rail}>
                <View style={styles.dotBox}>
                  {active && <Pulse />}
                  <View style={[styles.dot, reached ? styles.dotOn : styles.dotOff]}>
                    {done && <Txt style={[f(700, 10, 1.2), { color: C.greenDeep }]}>✓</Txt>}
                  </View>
                </View>
                {!lastRow && <View style={[styles.line, { backgroundColor: done ? LIME : '#E7EAE8' }]} />}
              </View>
              <View style={styles.stepText}>
                <Txt numberOfLines={1} style={[f(600, 14, 1.25), { color: reached ? C.greenDeep : '#8A9A8E' }]}>{label}</Txt>
                <Txt numberOfLines={1} style={[f(400, 12.5, 1.25), { color: C.muted2 }]}>{sub(k, i)}</Txt>
              </View>
            </View>
          );
        })}
        {cancelled && (
          <View style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: C.danger }]}>
                <Txt style={[f(700, 10, 1.2), { color: '#fff' }]}>✕</Txt>
              </View>
            </View>
            <View style={styles.stepText}>
              <Txt numberOfLines={1} style={[f(600, 14, 1.25), { color: C.danger }]}>Order cancelled</Txt>
              <Txt numberOfLines={2} style={[f(400, 12.5, 1.25), { color: C.muted2 }]}>
                {[order.reachedAt.cancelled && when(order.reachedAt.cancelled), order.cancelReason].filter(Boolean).join(' · ') || 'Cancelled'}
              </Txt>
            </View>
          </View>
        )}
      </View>

      <View style={styles.shopper}>
        <View style={styles.avatar}>
          <Txt style={[f(700, 15, 1.2), { color: C.greenOk }]}>SK</Txt>
        </View>
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={f(600, 14, 1.25)}>{(store?.name || 'Spice Kart') + ' · your store'}</Txt>
          <Txt numberOfLines={1} style={[f(400, 12.5, 1.25), { color: C.muted }]}>{HEADLINE[order.status]}</Txt>
        </View>
        <Tap
          accessibilityLabel="Call the store"
          onPress={() => Linking.openURL('tel:' + phone.replace(/[^\d+]/g, '')).catch(() => useApp.getState().flash('Calling is not available on this device'))}
          style={styles.call}>
          <Svg width={16} height={16} viewBox="0 0 18 18" fill="none">
            <Path
              d="M4 3h3l1.4 3.4-2 1.3a9 9 0 004 4l1.3-2L15 11.2V14a1 1 0 01-1.1 1A12 12 0 013 4.1 1 1 0 014 3z"
              stroke={C.greenDeep}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
          </Svg>
        </Tap>
      </View>

      {delivered && (
        <Tap onPress={() => router.push('/support')} style={styles.issue}>
          <Txt style={f(600, 13, 1)}>Problem with this order?</Txt>
        </Tap>
      )}
    </ScrollView>
  );
}

const DOT = 19;

const styles = StyleSheet.create({
  header: { marginHorizontal: 17, paddingLeft: 14, paddingBottom: 8, gap: 2, borderBottomWidth: 1, borderBottomColor: C.divider },
  content: { paddingTop: 14, paddingHorizontal: 17, paddingBottom: 120, gap: 10 },

  map: { height: 200, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E3E7DC', backgroundColor: '#EEF1E9' },
  mapPill: { position: 'absolute', top: 10, left: 11, height: 24, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10 },
  mapDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: LIME },
  mapRoute: { position: 'absolute', bottom: 10, left: 10, color: '#7A857A' },
  zoomStack: { position: 'absolute', bottom: 11, right: 13, gap: 7 },
  zoom: { width: 28, height: 28, borderWidth: 1, borderColor: '#E3E7DC', borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  eta: { height: 57, borderRadius: 10, backgroundColor: C.forest, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },

  steps: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, paddingTop: 15, paddingHorizontal: 14, paddingBottom: 6 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rail: { alignItems: 'center', flexShrink: 0, alignSelf: 'stretch' },
  dotBox: { width: DOT, height: DOT },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: LIME },
  dotOff: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D4D9D6' },
  line: { flex: 1, width: 2 },
  stepText: { gap: 2, paddingBottom: 14, flex: 1, minWidth: 0 },

  shopper: { minHeight: 62, backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 39, height: 39, borderRadius: 8, backgroundColor: '#EFF2EA', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24, paddingBottom: 120 },
  emptyBtn: { marginTop: 6, height: 38, paddingHorizontal: 18, borderRadius: 8, backgroundColor: C.forest, justifyContent: 'center' },
  issue: { height: 44, borderRadius: 11, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  call: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
