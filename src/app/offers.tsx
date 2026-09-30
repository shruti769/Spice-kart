import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { BottomNav } from '@/components/bottom-nav';
import { BackIcon } from '@/components/icons';
import { Grad, Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { findCategory } from '@/data/catalog';
import { goBack, goTab, openCategory } from '@/lib/nav';
import { couponBadge, couponTerms, useCoupons, type Coupon } from '@/lib/remote-coupons';
import { useDeliverySettings } from '@/lib/remote-delivery';
import { dealsEndNote, tileImage, tileText, useOfferTiles, type OfferTile } from '@/lib/remote-offers';
import { shortBalance } from '@/lib/remote-wallet';
import { cartTotals, useApp, type CouponCode } from '@/store/app-store';

/** Soft tints cycled across the coupon cards' value panel. */
const TINTS = ['#F0F6DE', '#ECF2E5', '#F2F5E7'];

const flash = (msg: string) => useApp.getState().flash(msg);

function RupeeCircle({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={7.6} stroke={color} strokeWidth={1.5} />
      <Path d="M7.6 7.3h4.2M7.6 9.6h4.2M8.8 12.9l2.6-5.6" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

function SectionLabel({ children, note }: { children: string; note?: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Txt numberOfLines={1} style={[f(600, 10.5, 1.25), { letterSpacing: 0.6, color: C.muted2 }]}>{children}</Txt>
      {note && <Txt numberOfLines={1} style={[f(400, 11.5, 1.25), { color: C.muted3 }]}>{note}</Txt>}
    </View>
  );
}

/** Coupon code chip — Figma: padding 5/7, radius 5, 0.8px border dashed 1.6/0.8 (drawn in SVG for the exact dash). */
function CodeChip({ code }: { code: string }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  return (
    <View style={styles.code} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size && (
        <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Rect x={0.4} y={0.4} width={size.w - 0.8} height={size.h - 0.8} rx={4.6} fill="none" stroke="#CFCFC9" strokeWidth={0.8} strokeDasharray="1.6 0.8" />
        </Svg>
      )}
      <Txt numberOfLines={1} style={[f(700, 10, 1), { letterSpacing: 1, color: C.forest }]}>{code}</Txt>
    </View>
  );
}

/** Apply a coupon to the cart and head back to it when there's something to check out. */
function applyCoupon(code: CouponCode) {
  const state = useApp.getState();
  state.set({ coupon: code });
  const { n, couponNote } = cartTotals(state.cart, code, state.slot);
  flash(couponNote || code + ' applied to your cart');
  if (n > 0 && router.canGoBack()) router.back();
}

function CouponRow({ c, tint }: { c: Coupon; tint: string }) {
  const [value, unit] = couponBadge(c);
  const { code, title } = c;
  const terms = couponTerms(c, c.category_id ? findCategory(c.category_id)?.name : undefined);
  const applied = useApp((s) => s.coupon === code);
  return (
    <View style={[styles.card, styles.coupon]}>
      <View style={[styles.couponValue, { backgroundColor: tint }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          <Txt numberOfLines={1} style={[f(800, 21, 1.2), { color: C.forest }]}>{value}</Txt>
          <Txt numberOfLines={1} style={[f(600, 10.5, 1.2), { letterSpacing: 1, color: C.greenMuted }]}>{unit}</Txt>
        </View>
        <Svg width={1} height="100%">
          <Line x1={0.5} x2={0.5} y1={0} y2={400} stroke="#D8DDD0" strokeWidth={1} strokeDasharray="3 3" />
        </Svg>
      </View>
      <View style={styles.couponBody}>
        <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={f(700, 12.5, 1.2)}>{title}</Txt>
        <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(400, 10.5, 1.35), { color: C.muted }]}>{terms}</Txt>
        <View style={styles.couponFoot}>
          <CodeChip code={code} />
          {applied ? (
            <Tap onPress={() => useApp.getState().set({ coupon: null })} hitSlop={8} style={{ marginLeft: 'auto' }}>
              <Txt numberOfLines={1} style={[f(700, 14, 1.2), { color: C.greenOk }]}>Applied ✓</Txt>
            </Tap>
          ) : (
            <Tap onPress={() => applyCoupon(code)} hitSlop={8} style={{ marginLeft: 'auto' }}>
              <Txt numberOfLines={1} style={[f(700, 14, 1.2), { color: C.green }]}>Apply →</Txt>
            </Tap>
          )}
        </View>
      </View>
    </View>
  );
}

function DealTile({ d, freeOver }: { d: OfferTile; freeOver: number }) {
  const title = tileText(d.title, freeOver);
  const img = tileImage(d);
  const cat = d.category_id;
  return (
    // Deals point at category slugs; fall back to the Categories tab when there's none (or it's hidden).
    <Tap onPress={() => (cat && findCategory(cat) ? openCategory(cat) : goTab('categories'))} pressedStyle={{ borderColor: C.lime }} style={[styles.card, styles.deal]}>
      {img ? <Image source={img} contentFit="cover" accessibilityLabel={title} style={styles.dealImage} /> : <View style={[styles.dealImage, { backgroundColor: C.selectedBgAlt }]} />}
      <View style={styles.dealText}>
        <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={f(700, 15, 1.25)}>{title}</Txt>
        <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(400, 12.5, 1.3), { color: C.muted2 }]}>{tileText(d.subtitle, freeOver)}</Txt>
      </View>
    </Tap>
  );
}

function BankRow({ icon, title, sub, badge, last }: { icon: 'card' | 'wallet'; title: string; sub: string; badge: string; last?: boolean }) {
  return (
    <View style={[styles.bankRow, !last && styles.bankDivider]}>
      <View style={styles.bankIcon}>
        {icon === 'card' ? (
          <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
            <Rect x={2.6} y={5} width={14.8} height={10} rx={2} stroke={C.ink2} strokeWidth={1.5} />
            <Path d="M2.6 8.6h14.8" stroke={C.ink2} strokeWidth={1.5} />
          </Svg>
        ) : (
          <RupeeCircle color={C.ink2} />
        )}
      </View>
      <View style={{ gap: 2, flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={f(600, 12, 1.2)}>{title}</Txt>
        <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted2 }]}>{sub}</Txt>
      </View>
      <View style={styles.bankBadge}>
        <Txt numberOfLines={1} style={[f(600, 10.5, 1.2), { color: C.green }]}>{badge}</Txt>
      </View>
    </View>
  );
}

export default function OffersScreen() {
  const pad = usePad();
  const wallet = useApp((s) => s.wallet);
  const walletStr = shortBalance(wallet ?? 0);
  const { coupons, loaded } = useCoupons();
  const { freeOver } = useDeliverySettings();
  const { deals, bank } = useOfferTiles();

  return (
    <Screen>
      <Grad preset="header" style={[styles.header, { paddingTop: pad.top(54) }]}>
        <Tap accessibilityLabel="Back" onPress={goBack} hitSlop={8} style={styles.back}>
          <BackIcon size={18} color={C.forest} />
        </Tap>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={[f(700, 17, 1.2), { color: C.forest }]}>Offers & coupons</Txt>
          <Txt numberOfLines={1} style={[f(400, 13, 1.25), { color: C.greenMuted }]}>{coupons.length} live {coupons.length === 1 ? 'coupon' : 'coupons'}</Txt>
        </View>
        <View style={styles.wallet}>
          <RupeeCircle color={C.greenOk} />
          <Txt numberOfLines={1} style={[f(700, 14, 1.2), { color: C.forest }]}>{walletStr}</Txt>
        </View>
      </Grad>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: pad.bottom(30) + 90 }]} showsVerticalScrollIndicator={false}>
        {/* Featured offer: the admin's first (top-sorted) live coupon. */}
        {coupons.length > 0 && (
          <Tap onPress={() => applyCoupon(coupons[0].code)} style={styles.heroShadow}>
            <Grad colors={['#0B3D1F', '#14572A', '#1F7135']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.hero}>
              <Txt numberOfLines={1} style={[f(700, 12, 1.2), { letterSpacing: 1.2, color: C.lime }]}>
                {coupons[0].title.toUpperCase()}
              </Txt>
            </Grad>
          </Tap>
        )}

        <SectionLabel>COUPONS FOR YOU</SectionLabel>
        <View style={{ gap: 10 }}>
          {coupons.length === 0 ? (
            <Txt style={[f(400, 12.5, 1.5), { color: C.muted }]}>{loaded ? 'No coupons right now — check back soon.' : 'Loading coupons…'}</Txt>
          ) : (
            coupons.map((c, i) => <CouponRow key={c.id} c={c} tint={TINTS[i % TINTS.length]} />)
          )}
        </View>

        {deals.length > 0 && (
          <>
            <SectionLabel note={dealsEndNote(deals)}>SHOP THE DEALS</SectionLabel>
            <Grid data={deals} columns={2} gap={10} keyOf={(d) => d.id} renderItem={(d) => <DealTile d={d} freeOver={freeOver} />} />
          </>
        )}

        {bank.length > 0 && (
          <>
            <SectionLabel>BANK & PAYMENT OFFERS</SectionLabel>
            <View style={[styles.card, { overflow: 'hidden' }]}>
              {bank.map((b, i) => (
                <BankRow key={b.id} icon={b.icon} title={tileText(b.title, freeOver)} sub={tileText(b.subtitle, freeOver)} badge={b.badge} last={i === bank.length - 1} />
              ))}
            </View>
          </>
        )}
        <Txt style={[f(400, 12, 1.6), styles.note]}>
          One coupon per order. Offers cannot be combined with Spice Kart Money cashback unless stated.
        </Txt>
      </ScrollView>

      <BottomNav active={null} showCartBar={false} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 8, paddingRight: 10, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: '#DFE8CD' },
  back: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  wallet: { marginLeft: 'auto', height: 34, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: '#C8DFA4', backgroundColor: '#FDFEFA' },

  content: { paddingTop: 13, paddingHorizontal: 14 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, ...cardShadow },

  heroShadow: { borderRadius: 17, boxShadow: '0 8px 18px rgba(11,61,31,0.22)' },
  hero: { height: 33, borderRadius: 17, justifyContent: 'center', paddingHorizontal: 16, overflow: 'hidden' },

  sectionLabel: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 14, paddingBottom: 8 },

  // Figma: 374 × 86.375, radius 12, 0.8px border.
  coupon: { flexDirection: 'row', minHeight: 86.375, borderWidth: 0.8, overflow: 'hidden' },
  couponValue: { width: 85, flexShrink: 0, flexDirection: 'row' },
  couponBody: { flex: 1, minWidth: 0, justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 13, gap: 4 },
  couponFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  code: { paddingVertical: 5.8, paddingHorizontal: 7.8, borderRadius: 5, backgroundColor: '#F1F2EE' },

  deal: { flex: 1, overflow: 'hidden' },
  dealImage: { width: '100%', height: 89 },
  dealText: { paddingTop: 7, paddingHorizontal: 11, paddingBottom: 10, gap: 3 },

  bankRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13 },
  bankDivider: { borderBottomWidth: 1, borderBottomColor: C.dividerSoft },
  bankIcon: { width: 31, height: 31, borderRadius: 7, borderWidth: 1, borderColor: '#E3E3DE', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bankBadge: { height: 19, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 5, backgroundColor: C.selectedBgAlt },

  note: { color: C.muted3, marginTop: 12 },
});
