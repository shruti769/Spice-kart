import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { slotLabelOf } from '@/components/checkout/slot';
import { Photo, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { findProduct, money, type Product } from '@/data/catalog';
import { goTab } from '@/lib/nav';
import { useAddress, useApp, useTotals, type PlacedOrder } from '@/store/app-store';

/** Quantities are read when the store records them on the order (see report); otherwise ×1. */
const qtyOf = (order: PlacedOrder, id: string) => order.qty[id] ?? 1;

function InfoRow({ label, value, valueStyle, last }: { label: string; value: string; valueStyle: StyleProp<TextStyle>; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.divider]}>
      <Txt style={[f(400, 13.5, 1.25), { color: '#6E6E68' }]}>{label}</Txt>
      <Txt style={[f(600, 13.5, 1.22), { color: C.ink, textAlign: 'right', flexShrink: 1 }, valueStyle]}>{value}</Txt>
    </View>
  );
}

/** Lime check badge that pops in. */
function SuccessBadge() {
  const scale = useSharedValue(0.4);
  const check = useSharedValue(0);
  useEffect(() => {
    scale.set(withSpring(1, { damping: 11, stiffness: 180 }));
    check.set(withDelay(140, withTiming(1, { duration: 220 })));
  }, [scale, check]);
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const mark = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: 0.6 + check.value * 0.4 }] }));
  return (
    <Animated.View style={[{ width: 57, height: 57, borderRadius: 28.5, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }, badge]}>
      <Animated.View style={mark}>
        <Svg width={26} height={26} viewBox="0 0 32 32" fill="none">
          <Path d="M8 17l5.5 5.5L24 11" stroke={C.forest} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </Animated.View>
  );
}

export default function OrderConfirmedScreen() {
  const pad = usePad();
  const order = useApp((s) => s.order);
  const slot = useApp((s) => s.slot);
  const schDay = useApp((s) => s.schDay);
  const payment = useApp((s) => s.payment);
  const t = useTotals();

  const items = order ? order.itemIds.map((id) => findProduct(id)).filter((p): p is Product => !!p) : [];
  const addr = useAddress();
  const arriving = slot === 'ASAP' || !slot ? 'Express delivery' : slotLabelOf(slot, schDay);

  return (
    <Screen style={{ backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={[styles.content, { paddingTop: pad.top(64) }]} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center' }}>
          <SuccessBadge />
          <Animated.View entering={FadeIn.delay(120).duration(260)} style={{ alignItems: 'center', gap: 9, marginTop: 10 }}>
            <Txt style={[f(700, 20.5, 1.2), { textAlign: 'center' }]}>Order placed!</Txt>
            <Txt style={[f(400, 13.5, 1.45), { color: '#6E6E68', textAlign: 'center' }]}>Your groceries are on the way.</Txt>
          </Animated.View>
        </View>

        <View style={[styles.card, { marginTop: 19 }]}>
          <InfoRow label="Order number" value={order ? order.no : 'Order #SK10482'} valueStyle={null} />
          <InfoRow label="Arriving" value={arriving} valueStyle={{ color: C.green }} />
          {/* Break before "VIC 3000" so it reads as two lines, as in the design. */}
          <InfoRow label="Delivering to" value={addr.line.replace(/ (?=[A-Z]{2,3} \d{4}$)/, '\n')} valueStyle={f(500, 13.5, 1.22)} />
          <InfoRow label={'Paid with ' + payment} value={order ? order.total : money(t.total)} valueStyle={f(700, 14, 1.22)} last />
        </View>

        {order && items.length > 0 && (
          <>
            <Txt style={styles.itemsLabel}>{items.length + (items.length === 1 ? ' item' : ' items') + ' in this order'}</Txt>
            {/* The design's item card runs ~9pt further right than the info card. */}
            <View style={[styles.card, { marginRight: -9 }]}>
              {items.map((p, i) => {
                const qty = qtyOf(order, p.id);
                return (
                  <View key={p.id} style={[styles.item, i < items.length - 1 && styles.divider]}>
                    <Photo source={p.img} crop={typeof p.img === 'string'} style={styles.thumb} />
                    <Txt numberOfLines={2} style={[f(500, 13.5, 1.3), { flex: 1 }]}>{p.name}</Txt>
                    <Txt numberOfLines={1} style={[f(400, 12.5, 1.2), { color: C.muted }]}>×{qty}</Txt>
                    <Txt style={f(700, 14, 1.2)}>{money(p.price * qty)}</Txt>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: pad.bottom(30) }]}>
        <Tap onPress={() => router.push({ pathname: '/track', params: order?.id ? { id: order.id } : {} })} pressedStyle={{ backgroundColor: C.limeHover }} style={styles.track}>
          <Txt style={[f(700, 16, 1.2), { color: C.forest }]}>Track order</Txt>
        </Tap>
        <Tap onPress={() => goTab('home')} pressedStyle={{ backgroundColor: C.field }} style={styles.continue}>
          <Txt style={[f(600, 14.5, 1.2), { color: C.ink }]}>Continue shopping</Txt>
        </Tap>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 19, paddingBottom: 20 },
  card: { borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fff', ...cardShadow },
  divider: { borderBottomWidth: 1, borderBottomColor: C.dividerSoft },
  infoRow: { minHeight: 40, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, paddingVertical: 11, paddingLeft: 13, paddingRight: 12 },
  itemsLabel: { ...f(600, 12.5, 1.25), letterSpacing: 0.3, color: C.muted2, marginTop: 22, marginBottom: 10 },
  item: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 12, paddingRight: 12 },
  thumb: { width: 41, height: 41, borderRadius: 6, flexShrink: 0 },
  footer: { paddingTop: 18, paddingHorizontal: 13, gap: 9, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.divider },
  track: { height: 46, borderRadius: 12, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(107,176,0,0.24)' },
  continue: { height: 46, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
