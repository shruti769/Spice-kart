import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { BackIcon } from '@/components/icons';
import { ProductCard, QtyStepper } from '@/components/product-card';
import { Photo, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { LOCAL, findProduct, money, type Product } from '@/data/catalog';
import { goBack, goTab } from '@/lib/nav';
import { useProducts } from '@/lib/remote-catalog';
import { useEtaMinutes } from '@/lib/remote-delivery';
import { useCoupons } from '@/lib/remote-coupons';
import { useApp, useTotals } from '@/store/app-store';

/** One line in the bill. */
function BillRow({ label, value, color = C.ink }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.billRow}>
      <Txt numberOfLines={1} style={[f(400, 13.5, 1.3), { color: '#6E6E68' }]}>{label}</Txt>
      <Txt numberOfLines={1} style={[f(500, 13.5, 1.3), { color }]}>{value}</Txt>
    </View>
  );
}

/** Cart line: thumb, name/weight, stepper, line total. */
function CartLine({ p, qty, last }: { p: Product; qty: number; last: boolean }) {
  return (
    <View style={[styles.line, !last && styles.lineDivider]}>
      <Photo source={p.img} crop={typeof p.img === 'string'} style={styles.thumb} />
      <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={2} style={f(600, 14, 1.3)}>{p.name}</Txt>
        <Txt style={[f(400, 13, 1.25), { color: C.muted }]}>{p.weight}</Txt>
      </View>
      <QtyStepper id={p.id} qty={qty} height={28} width={23} />
      <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[f(700, 15, 1.2), styles.lineTotal]}>{money(p.price * qty)}</Txt>
    </View>
  );
}

/** Free-delivery progress bar; animates when the subtotal changes. */
function FreeBar({ pct }: { pct: number }) {
  const w = useSharedValue(pct);
  useEffect(() => {
    w.set(withTiming(pct, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [pct, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={styles.bar}>
      <Animated.View style={[styles.barFill, fill]} />
    </View>
  );
}

/** Cart (prototype `sCart`). */
export default function CartScreen() {
  const pad = usePad();
  const eta = useEtaMinutes();
  const cart = useApp((s) => s.cart);
  const T = useTotals();
  const coupon = useApp((s) => s.coupon);
  const couponCount = useCoupons().coupons.length;
  const hasCart = T.n > 0;
  const cartMeta = T.n + (T.n === 1 ? ' item' : ' items');
  const unlocked = T.sub >= T.freeOver;
  const freePct = Math.min(100, Math.round((T.sub / T.freeOver) * 100));
  const lines = Object.keys(cart)
    .map((id) => ({ p: findProduct(id), qty: cart[id] }))
    .filter((l): l is { p: Product; qty: number } => !!l.p);
  const products = useProducts();
  const suggestions = products.filter((p) => !cart[p.id] && !p.out).slice(0, 5);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: pad.top(52) }]}>
        <Tap accessibilityLabel="Back" onPress={goBack} hitSlop={8} style={styles.back}>
          <BackIcon size={18} />
        </Tap>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={f(700, 17, 1.2)}>Your cart</Txt>
          <Txt numberOfLines={1} style={[f(400, 13, 1.25), { color: C.muted }]}>{cartMeta}</Txt>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {hasCart ? (
          <View style={{ gap: 13 }}>
            <View style={styles.eta}>
              <Svg width={17} height={17} viewBox="0 0 20 20" fill="none">
                <Circle cx={10} cy={10} r={7} stroke={C.green} strokeWidth={1.7} />
                <Path d="M10 6v4.3l3 1.8" stroke={C.green} strokeWidth={1.7} strokeLinecap="round" />
              </Svg>
              <Txt numberOfLines={1} style={[f(600, 13.5, 1.25), { color: '#2F4A36' }]}>Delivery in {eta} minutes</Txt>
            </View>

            <View style={[styles.card, styles.free]}>
              <View style={styles.row}>
                <Svg width={19} height={19} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <Path d="M2.5 7.5h10v9h-10v-9z" stroke={C.green} strokeWidth={1.7} strokeLinejoin="round" />
                  <Path d="M12.5 10.5H17l3 3v3h-7.5v-6z" stroke={C.green} strokeWidth={1.7} strokeLinejoin="round" />
                  <Circle cx={6.5} cy={18} r={1.7} stroke={C.green} strokeWidth={1.7} />
                  <Circle cx={16} cy={18} r={1.7} stroke={C.green} strokeWidth={1.7} />
                </Svg>
                <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(600, 12, 1.3), { flexShrink: 1 }]}>
                  {unlocked ? 'Free delivery unlocked on this order' : 'Add ' + money(T.freeOver - T.sub) + ' more to get FREE delivery'}
                </Txt>
              </View>
              <FreeBar pct={freePct} />
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Txt numberOfLines={1} style={[f(400, 12, 1.25), { color: C.muted2 }]}>
                  {unlocked ? 'Delivery is on us for this order' : 'Free delivery over $' + T.freeOver.toFixed(0)}
                </Txt>
                <Tap onPress={() => goTab('home')} hitSlop={6}>
                  <Txt numberOfLines={1} style={[f(600, 13, 1.25), { color: C.green }]}>Add more items →</Txt>
                </Tap>
              </View>
            </View>

            <Tap onPress={() => router.push('/offers')} pressedStyle={{ borderColor: C.lime }} style={[styles.card, styles.coupon]}>
              <View style={styles.couponIcon}>
                <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
                  <Path d="M3 5.5h14v3a1.8 1.8 0 000 3.6v2.4H3v-2.4a1.8 1.8 0 000-3.6v-3z" stroke={C.green} strokeWidth={1.5} strokeLinejoin="round" />
                  <Path d="M8 8l4 4M8.2 8.2h.01M11.8 11.8h.01" stroke={C.green} strokeWidth={1.5} strokeLinecap="round" />
                </Svg>
              </View>
              <View style={{ gap: 2, minWidth: 0, flex: 1 }}>
                <Txt numberOfLines={1} style={f(600, 12, 1.2)}>{coupon ? coupon + ' applied' : 'Apply a coupon'}</Txt>
                <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[f(400, 10.5, 1.2), { color: coupon && T.couponNote ? C.danger : coupon ? C.greenOk : C.muted }]}>
                  {!coupon
                    ? couponCount > 0
                      ? `${couponCount} ${couponCount === 1 ? 'coupon' : 'coupons'} available for this order`
                      : 'See offers for this order'
                    : T.couponNote || (T.discount > 0 ? 'You save ' + money(T.discount) : 'Free delivery on this order')}
                </Txt>
              </View>
              {coupon ? (
                <Tap onPress={() => useApp.getState().set({ coupon: null })} hitSlop={8}>
                  <Txt numberOfLines={1} style={[f(600, 11, 1.3), { flexShrink: 0, color: C.danger }]}>Remove</Txt>
                </Tap>
              ) : (
                <Txt numberOfLines={1} style={[f(600, 11, 1.3), { flexShrink: 0, color: C.green }]}>See all coupons</Txt>
              )}
            </Tap>

            <Animated.View layout={LinearTransition.duration(200)} style={[styles.card, { overflow: 'hidden' }]}>
              {lines.map(({ p, qty }, i) => (
                <CartLine key={p.id} p={p} qty={qty} last={i === lines.length - 1} />
              ))}
            </Animated.View>

            {suggestions.length > 0 && (
            <View style={{ gap: 8, marginTop: 2 }}>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Txt numberOfLines={1} style={f(700, 14, 1.25)}>You might also like</Txt>
                <Txt numberOfLines={1} style={[f(400, 12.5, 1.25), { color: C.muted2 }]}>Frequently added together</Txt>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginRight: -13 }} contentContainerStyle={{ gap: 10, paddingRight: 13, paddingBottom: 2 }}>
                {suggestions.map((p) => (
                  <ProductCard key={p.id} p={p} style={{ flexShrink: 0, width: 110 }} />
                ))}
              </ScrollView>
            </View>
            )}

            <View style={[styles.card, styles.bill]}>
              <Txt style={f(700, 14, 1.25)}>Bill details</Txt>
              <BillRow label="Item total" value={money(T.sub)} />
              <BillRow label="Delivery fee" value={T.delivery === 0 ? 'FREE' : money(T.delivery)} color={T.delivery === 0 ? C.greenOk : C.ink} />
              <BillRow label="Handling fee" value={money(T.service)} />
              {T.discount > 0 && <BillRow label={'Coupon · ' + coupon} value={'− ' + money(T.discount)} color={C.greenOk} />}
              <View style={{ height: 1, backgroundColor: C.divider }} />
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Txt style={f(700, 14.5, 1.25)}>To pay</Txt>
                <Txt style={f(700, 18, 1.2)}>{money(T.total)}</Txt>
              </View>
            </View>

            <View style={styles.policy}>
              <Txt style={[f(600, 13, 1.25), { color: C.ink2 }]}>Cancellation policy</Txt>
              <Txt style={[f(400, 12.5, 1.55), { color: C.muted }]}>
                Orders can be cancelled free of charge until your shopper starts picking. After that a small restocking fee applies for fresh items. Refunds reach
                your original payment method within 3–5 business days.
              </Txt>
            </View>
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(180)} style={styles.empty}>
            <Image source={LOCAL.appIcon} style={{ width: 48, height: 48, borderRadius: 12 }} />
            <Txt style={[f(700, 15.5, 1.3), { marginTop: 4, textAlign: 'center' }]}>Your cart is empty</Txt>
            <Txt style={[f(400, 12.5, 1.5), { color: C.muted, maxWidth: 220, textAlign: 'center' }]}>Add some fresh essentials to get started.</Txt>
            <Tap onPress={() => goTab('home')} pressedStyle={{ backgroundColor: C.limeHover }} style={styles.emptyButton}>
              <Txt style={[f(700, 13, 1.2), { color: C.forest }]}>Start shopping</Txt>
            </Tap>
          </Animated.View>
        )}
      </ScrollView>

      {hasCart && (
        <View style={[styles.footer, { paddingBottom: pad.bottom(30) }]}>
          <View style={{ gap: 1 }}>
            <Txt style={f(700, 18, 1.2)}>{money(T.total)}</Txt>
            <Txt style={[f(400, 12.5, 1.2), { color: C.muted }]}>{cartMeta}</Txt>
          </View>
          <Tap onPress={() => router.push('/checkout')} pressedStyle={{ backgroundColor: C.limeHover }} style={styles.checkout}>
            <Txt style={[f(700, 16, 1.2), { color: C.forest }]}>Proceed to checkout</Txt>
          </Tap>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingBottom: 7, backgroundColor: '#fff' },
  back: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 13, paddingLeft: 21, paddingRight: 13, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, ...cardShadow },

  eta: { alignSelf: 'flex-start', height: 38, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: 10, backgroundColor: '#EFF2EA', borderWidth: 1, borderColor: '#E1E7D9' },

  free: { paddingTop: 12, paddingHorizontal: 13, paddingBottom: 10, gap: 10 },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#EDEFE9', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: C.lime },

  coupon: { minHeight: 55, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13 },
  couponIcon: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#F3F8E1', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  line: { minHeight: 69, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 10 },
  lineDivider: { borderBottomWidth: 1, borderBottomColor: C.dividerSoft },
  thumb: { width: 49, height: 49, borderRadius: 6, flexShrink: 0 },
  lineTotal: { width: 58, textAlign: 'right' },

  bill: { padding: 12, gap: 9 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  policy: { gap: 6, padding: 12, borderRadius: 10, backgroundColor: '#F1F2EE', borderWidth: 1, borderColor: C.borderSoft },

  empty: { alignItems: 'center', gap: 8, paddingVertical: 70, paddingHorizontal: 20 },
  emptyButton: { marginTop: 6, height: 40, paddingHorizontal: 20, borderRadius: 8, backgroundColor: C.lime, justifyContent: 'center' },

  footer: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 13, paddingTop: 17, paddingLeft: 20, paddingRight: 13, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.divider, boxShadow: '0 -6px 18px rgba(16,24,16,0.05)' },
  checkout: { flex: 1, height: 46, borderRadius: 12, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(107,176,0,0.22)' },
});
