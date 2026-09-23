import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View, type StyleProp, type TextStyle } from 'react-native';
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
import { ADDRESSES, findProduct, money, type Product } from '@/data/catalog';
import { goTab } from '@/lib/nav';
import { useApp, useTotals, type PlacedOrder } from '@/store/app-store';

/** Quantities are read when the store records them on the order (see report); otherwise ×1. */
const qtyOf = (order: PlacedOrder, id: string) => order.qty[id] ?? 1;

function InfoRow({ label, value, valueStyle, last }: { label: string; value: string; valueStyle: StyleProp<TextStyle>; last?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 14,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.dividerSoft,
      }}>
      <Txt style={[f(400, 12, 1.3), { color: '#6E6E68' }]}>{label}</Txt>
      <Txt style={[f(400, 12, 1.3), { color: C.ink }, valueStyle]}>{value}</Txt>
    </View>
  );
}

/** Lime check badge that pops in. */
function SuccessBadge() {
  const scale = useSharedValue(0.4);
  const check = useSharedValue(0);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 11, stiffness: 180 });
    check.value = withDelay(140, withTiming(1, { duration: 220 }));
  }, [scale, check]);
  const badge = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const mark = useAnimatedStyle(() => ({ opacity: check.value, transform: [{ scale: 0.6 + check.value * 0.4 }] }));
  return (
    <Animated.View style={[{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }, badge]}>
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
  const addrIdx = useApp((s) => s.addr);
  const t = useTotals();

  const items = order ? order.itemIds.map((id) => findProduct(id)).filter((p): p is Product => !!p) : [];
  const addr = ADDRESSES[addrIdx] ?? ADDRESSES[0];

  return (
    <Screen style={{ backgroundColor: '#fff' }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: '#fff' }}
        contentContainerStyle={{ paddingTop: pad.top(64), paddingHorizontal: 14, paddingBottom: 20, gap: 16 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: 'center', gap: 9 }}>
          <SuccessBadge />
          <Animated.View entering={FadeIn.delay(120).duration(260)} style={{ alignItems: 'center', gap: 9 }}>
            <Txt style={[f(700, 20, 1.25), { textAlign: 'center' }]}>Order placed!</Txt>
            <Txt style={[f(400, 13, 1.5), { color: '#6E6E68', textAlign: 'center' }]}>Your groceries are on the way.</Txt>
          </Animated.View>
        </View>

        <View style={{ borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden', ...cardShadow }}>
          <InfoRow label="Order number" value={order ? order.no : 'Order #SK10500'} valueStyle={f(600, 12, 1.3)} />
          <InfoRow label="Arriving" value={slotLabelOf(slot, schDay)} valueStyle={[f(600, 12, 1.3), { color: C.green }]} />
          <InfoRow
            label="Delivering to"
            value={addr.line}
            valueStyle={[f(500, 12, 1.3), { textAlign: 'right', maxWidth: 180, flexShrink: 1 }]}
          />
          <InfoRow label={'Paid with ' + payment} value={order ? order.total : money(t.total)} valueStyle={f(700, 12, 1.3)} last />
        </View>

        <View style={{ gap: 8 }}>
          <Txt style={[f(600, 11, 1), { letterSpacing: 0.5, color: C.muted2 }]}>
            {order ? items.length + ' items in this order' : ''}
          </Txt>
          <View style={{ borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden', ...cardShadow }}>
            {order &&
              items.map((p) => {
                const qty = qtyOf(order, p.id);
                return (
                  <View
                    key={p.id}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: C.dividerSoft }}>
                    <Photo source={p.img} style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0 }} />
                    <Txt style={[f(500, 12, 1.3), { flex: 1 }]}>{p.name}</Txt>
                    <Txt numberOfLines={1} style={[f(400, 11, 1), { color: C.muted }]}>×{qty}</Txt>
                    <Txt style={f(600, 12, 1)}>{money(p.price * qty)}</Txt>
                  </View>
                );
              })}
          </View>
        </View>
      </ScrollView>

      <View
        style={{
          paddingTop: 10,
          paddingHorizontal: 14,
          paddingBottom: pad.bottom(30),
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: C.divider,
          gap: 8,
        }}>
        <Tap
          onPress={() => router.push('/track')}
          pressedStyle={{ backgroundColor: C.forestHover }}
          style={{ height: 46, borderRadius: 11, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(11,61,31,0.18)' }}>
          <Txt style={[f(700, 14, 1), { color: '#fff' }]}>Track order</Txt>
        </Tap>
        <Tap
          onPress={() => goTab('home')}
          style={{ height: 40, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={[f(600, 13, 1), { color: C.ink }]}>Continue shopping</Txt>
        </Tap>
      </View>
    </Screen>
  );
}
