import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { ProductCard, QtyStepper } from '@/components/product-card';
import { ScreenHeader } from '@/components/screen-header';
import { Photo, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { ETA_MINUTES, LOCAL, byNames, findProduct, money, type Product } from '@/data/catalog';
import { goTab } from '@/lib/nav';
import { useApp, useTotals } from '@/store/app-store';

const SUGGESTED = byNames(['Salted Butter', 'Free Range Eggs', 'Cavendish Bananas', 'Baby Spinach', 'Greek Yoghurt', 'White Sandwich Loaf']);

const card = [{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12 }, cardShadow];

/** One line in the bill (`font:400 12px/1.3;color:#6E6E68`, value 500 weight). */
function BillRow({ label, value, color = C.ink }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14 }}>
      <Txt numberOfLines={1} style={[f(400, 12, 1.3), { color: '#6E6E68' }]}>
        {label}
      </Txt>
      <Txt numberOfLines={1} style={[f(500, 12, 1.3), { color }]}>
        {value}
      </Txt>
    </View>
  );
}

/** Cart line: thumb, name/weight, stepper, line total. */
function CartLine({ p, qty }: { p: Product; qty: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 11, borderBottomWidth: 1, borderBottomColor: C.dividerSoft }}>
      <Photo source={p.img} style={{ width: 48, height: 48, borderRadius: 6, flexShrink: 0 }} />
      <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <Txt style={f(600, 12.5, 1.3)}>{p.name}</Txt>
        <Txt style={[f(400, 11, 1.2), { color: C.muted }]}>{p.weight}</Txt>
      </View>
      <View style={{ flexShrink: 0 }}>
        <QtyStepper id={p.id} qty={qty} />
      </View>
      <Txt style={[f(700, 12.5, 1), { width: 52, textAlign: 'right' }]}>{money(p.price * qty)}</Txt>
    </View>
  );
}

/** Free-delivery progress bar; animates when the subtotal changes. */
function FreeBar({ pct }: { pct: number }) {
  const w = useSharedValue(pct);
  useEffect(() => {
    w.value = withTiming(pct, { duration: 320, easing: Easing.out(Easing.cubic) });
  }, [pct, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: '#EDEFE8', overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: 3, backgroundColor: C.lime }, fill]} />
    </View>
  );
}

/** Cart (prototype `sCart`). */
export default function CartScreen() {
  const pad = usePad();
  const cart = useApp((s) => s.cart);
  const T = useTotals();
  const hasCart = T.n > 0;
  const cartMeta = T.n + (T.n === 1 ? ' item' : ' items');
  const unlocked = T.sub >= T.freeOver;
  const freePct = Math.min(100, Math.round((T.sub / T.freeOver) * 100));
  const lines = Object.keys(cart)
    .map((id) => ({ p: findProduct(id), qty: cart[id] }))
    .filter((l): l is { p: Product; qty: number } => !!l.p);
  const suggestions = SUGGESTED.filter((p) => !cart[p.id]).slice(0, 5);

  return (
    <Screen>
      <ScreenHeader title="Your cart" subtitle={cartMeta} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {hasCart ? (
          <View style={{ gap: 12 }}>
            {/* ETA strip */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#EEF2E9', borderWidth: 1, borderColor: '#E1E7D9' }}>
              <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
                <Circle cx={10} cy={10} r={7} stroke={C.green} strokeWidth={1.7} />
                <Path d="M10 6v4.3l3 1.8" stroke={C.green} strokeWidth={1.7} strokeLinecap="round" />
              </Svg>
              <Txt style={[f(600, 12, 1.3), { color: '#2F4A36', flexShrink: 1 }]}>
                Delivery in {ETA_MINUTES} minutes · packed at Collingwood store
              </Txt>
            </View>

            {/* Free delivery progress */}
            <View style={[card, { paddingVertical: 11, paddingHorizontal: 12, gap: 8 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <Path d="M2.5 7.5h10v9h-10v-9z" stroke={C.green} strokeWidth={1.7} strokeLinejoin="round" />
                  <Path d="M12.5 10.5H17l3 3v3h-7.5v-6z" stroke={C.green} strokeWidth={1.7} strokeLinejoin="round" />
                  <Circle cx={6.5} cy={18} r={1.7} stroke={C.green} strokeWidth={1.7} />
                  <Circle cx={16} cy={18} r={1.7} stroke={C.green} strokeWidth={1.7} />
                </Svg>
                <Txt style={[f(600, 12, 1.3), { color: C.ink, flexShrink: 1 }]}>
                  {unlocked ? 'Free delivery unlocked on this order' : 'Add ' + money(T.freeOver - T.sub) + ' more to get FREE delivery'}
                </Txt>
              </View>
              <FreeBar pct={freePct} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Txt numberOfLines={1} style={[f(400, 10.5, 1), { color: C.muted2 }]}>
                  {unlocked ? 'Delivery is on us for this order' : 'Free delivery over $' + T.freeOver.toFixed(0)}
                </Txt>
                <Tap onPress={() => goTab('home')} hitSlop={6}>
                  <Txt numberOfLines={1} style={[f(600, 11, 1), { color: C.green }]}>
                    Add more items →
                  </Txt>
                </Tap>
              </View>
            </View>

            {/* Coupon */}
            <Tap
              onPress={() => router.push('/offers')}
              pressedStyle={{ borderColor: C.lime }}
              style={[card, { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12 }]}>
              <View style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: C.selectedBgAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
                  <Path d="M3 5.5h14v3a1.8 1.8 0 000 3.6v2.4H3v-2.4a1.8 1.8 0 000-3.6v-3z" stroke={C.green} strokeWidth={1.5} strokeLinejoin="round" />
                  <Path d="M8 8l4 4M8.2 8.2h.01M11.8 11.8h.01" stroke={C.green} strokeWidth={1.5} strokeLinecap="round" />
                </Svg>
              </View>
              <View style={{ gap: 3, minWidth: 0, flexShrink: 1 }}>
                <Txt numberOfLines={1} style={f(600, 12, 1.2)}>
                  Apply a coupon
                </Txt>
                <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted }]}>
                  6 coupons available for this order
                </Txt>
              </View>
              <Txt numberOfLines={1} style={[f(600, 11, 1), { marginLeft: 'auto', color: C.green }]}>
                See all coupons
              </Txt>
            </Tap>

            {/* Items */}
            <Animated.View layout={LinearTransition.duration(200)} style={[card, { overflow: 'hidden' }]}>
              {lines.map(({ p, qty }) => (
                <CartLine key={p.id} p={p} qty={qty} />
              ))}
            </Animated.View>

            {/* Suggestions */}
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <Txt numberOfLines={1} style={f(700, 12.5, 1)}>
                  You might also like
                </Txt>
                <Txt numberOfLines={1} style={[f(400, 10.5, 1), { color: C.muted2 }]}>
                  Frequently added together
                </Txt>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingBottom: 2 }}>
                {suggestions.map((p) => (
                  <ProductCard key={p.id} p={p} style={{ flexShrink: 0, width: 124 }} />
                ))}
              </ScrollView>
            </View>

            {/* Bill */}
            <View style={[card, { padding: 12, gap: 9 }]}>
              <Txt style={f(700, 12.5, 1)}>Bill details</Txt>
              <BillRow label="Item total" value={money(T.sub)} />
              <BillRow label="Delivery fee" value={T.delivery === 0 ? 'FREE' : money(T.delivery)} color={T.delivery === 0 ? C.greenOk : C.greenDeep} />
              <BillRow label="Handling fee" value={money(T.service)} />
              <View style={{ height: 1, backgroundColor: C.divider }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Txt style={f(700, 13, 1)}>To pay</Txt>
                <Txt style={f(700, 16, 1)}>{money(T.total)}</Txt>
              </View>
            </View>

            {/* Policy */}
            <View style={{ gap: 6, padding: 12, borderRadius: 9, backgroundColor: '#F1F2EE', borderWidth: 1, borderColor: C.borderSoft }}>
              <Txt style={[f(600, 11, 1), { color: C.ink2 }]}>Cancellation policy</Txt>
              <Txt style={[f(400, 10.5, 1.55), { color: C.muted }]}>
                Orders can be cancelled free of charge until your shopper starts picking. After that a small restocking fee applies for fresh items. Refunds reach
                your original payment method within 3–5 business days.
              </Txt>
            </View>
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(180)} style={{ alignItems: 'center', gap: 8, paddingVertical: 70, paddingHorizontal: 20 }}>
            <Image source={LOCAL.appIcon} style={{ width: 48, height: 48, borderRadius: 12 }} />
            <Txt style={[f(700, 15.5, 1.3), { marginTop: 4, textAlign: 'center' }]}>Your cart is empty</Txt>
            <Txt style={[f(400, 12.5, 1.5), { color: C.muted, maxWidth: 220, textAlign: 'center' }]}>Add some fresh essentials to get started.</Txt>
            <Tap
              onPress={() => goTab('home')}
              pressedStyle={{ backgroundColor: C.forestHover }}
              style={{ marginTop: 6, height: 40, paddingHorizontal: 20, borderRadius: 8, backgroundColor: C.forest, justifyContent: 'center' }}>
              <Txt style={[f(600, 12.5, 1), { color: '#fff' }]}>Start shopping</Txt>
            </Tap>
          </Animated.View>
        )}
      </ScrollView>

      {hasCart && (
        <View
          style={{
            flexShrink: 0,
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
            <Txt style={f(700, 14.5, 1)}>{money(T.total)}</Txt>
            <Txt style={[f(400, 10.5, 1), { color: C.muted }]}>{cartMeta}</Txt>
          </View>
          <Tap
            onPress={() => router.push('/checkout')}
            pressedStyle={{ backgroundColor: C.forestHover }}
            style={{
              flex: 1,
              height: 46,
              borderRadius: 11,
              backgroundColor: C.forest,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 14px rgba(11,61,31,0.18)',
            }}>
            <Txt style={[f(700, 14, 1), { color: '#fff' }]}>Proceed to checkout</Txt>
          </Tap>
        </View>
      )}
    </Screen>
  );
}
