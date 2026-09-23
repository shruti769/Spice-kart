import { ScrollView, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { WalletIcon } from '@/components/icons';
import { ScreenHeader } from '@/components/screen-header';
import { Grad, Grid, Photo, Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { FREE_OVER, WALLET_BALANCE, photo } from '@/data/catalog';
import { openCategory } from '@/lib/nav';
import { useApp } from '@/store/app-store';

const COUPONS: [value: string, unit: string, title: string, terms: string, code: string, tint: string][] = [
  ['$5', 'OFF', 'Flat $5 off your first order', 'No minimum spend · new customers', 'SPICE5', '#EEF7DC'],
  ['20%', 'OFF', '20% off fresh vegetables', 'Min spend $25 · max discount $10', 'FRESH20', '#EAF3E4'],
  ['FREE', 'DELIVERY', 'Free delivery all week', 'On orders above $199 · all suburbs', 'SKFREE', '#F1F5E6'],
];

/** [headline, sub, terms, photo key, category]. `cat-pantry` has no photo and falls back to the basket shot. */
const OFFERS: [string, string, string, string, string][] = [
  ['20% OFF', 'Fresh produce', 'Min spend $25 · ends Sunday', 'market', 'produce'],
  ['$5 OFF', 'Your first order', 'Applied automatically at checkout', 'bag', 'produce'],
  ['Buy 2, Save More', 'Selected pantry essentials', 'Rice, pasta and pulses', 'cat-pantry', 'grains'],
  ['15% OFF', 'Dairy & refrigerated', 'Before 10am daily', 'cat-dairy', 'dairy'],
  ['Free delivery', 'Orders over $' + FREE_OVER.toFixed(0), 'Every day, all suburbs', 'basket', 'bakery'],
  ['10% OFF', 'Spice Kart Select spices', 'Our own small-batch blends', 'cat-spice', 'spice'],
];

const LABEL = [f(600, 10.5, 1), { letterSpacing: 0.6, color: C.muted2 }];
const flash = (msg: string) => useApp.getState().flash(msg);

function CouponRow({ c: [value, unit, title, terms, code, tint] }: { c: (typeof COUPONS)[number] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden', ...cardShadow }}>
      <View style={{ width: 82, flexShrink: 0, flexDirection: 'row', backgroundColor: tint }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          <Txt numberOfLines={1} style={[f(800, 17, 1), { color: C.forest }]}>{value}</Txt>
          <Txt numberOfLines={1} style={[f(600, 8.5, 1), { letterSpacing: 0.5, color: C.greenMuted }]}>{unit}</Txt>
        </View>
        {/* border-right:1px dashed #D8DDD0 */}
        <Svg width={1} height="100%">
          <Line x1={0.5} x2={0.5} y1={0} y2={400} stroke="#D8DDD0" strokeWidth={1} strokeDasharray="3 3" />
        </Svg>
      </View>
      <View style={{ flex: 1, minWidth: 0, paddingVertical: 11, paddingHorizontal: 12, gap: 5 }}>
        <Txt numberOfLines={1} style={f(700, 12.5, 1.2)}>{title}</Txt>
        <Txt style={[f(400, 10.5, 1.35), { color: C.muted }]}>{terms}</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <View style={{ backgroundColor: '#F1F2EE', borderWidth: 1, borderStyle: 'dashed', borderColor: '#CFCFC9', paddingVertical: 5, paddingHorizontal: 7, borderRadius: 5 }}>
            <Txt numberOfLines={1} style={[f(700, 10, 1), { letterSpacing: 1, color: C.forest }]}>{code}</Txt>
          </View>
          <Tap onPress={() => flash(code + ' applied')} hitSlop={8} style={{ marginLeft: 'auto' }}>
            <Txt numberOfLines={1} style={[f(700, 11, 1), { color: C.green }]}>Apply →</Txt>
          </Tap>
        </View>
      </View>
    </View>
  );
}

function OfferTile({ o: [headline, sub, terms, key, cat] }: { o: (typeof OFFERS)[number] }) {
  return (
    <Tap
      onPress={() => openCategory(cat)}
      pressedStyle={{ borderColor: C.lime }}
      style={{ flex: 1, borderWidth: 1, borderColor: C.borderCard, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', ...cardShadow }}>
      <View style={{ height: 82, backgroundColor: '#F1F3EE' }}>
        <Photo source={photo(key)} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: '#F1F3EE' }} />
        <View style={{ position: 'absolute', top: 6, left: 6, backgroundColor: C.lime, paddingVertical: 5, paddingHorizontal: 6, borderRadius: 5 }}>
          <Txt numberOfLines={1} style={[f(800, 9.5, 1), { color: C.forest }]}>{headline}</Txt>
        </View>
      </View>
      <View style={{ paddingTop: 9, paddingHorizontal: 10, paddingBottom: 11, gap: 4 }}>
        <Txt numberOfLines={1} style={f(700, 12, 1.2)}>{sub}</Txt>
        <Txt style={[f(400, 10, 1.3), { color: C.muted2 }]}>{terms}</Txt>
      </View>
    </Tap>
  );
}

function BankRow({ icon, title, sub, badge, last }: { icon: 'card' | 'wallet'; title: string; sub: string; badge: string; last?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.dividerSoft }}>
      <View style={{ width: 30, height: 30, borderWidth: 1, borderColor: '#D9D9D4', borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
          {icon === 'card' ? (
            <>
              <Rect x={2.6} y={5} width={14.8} height={10} rx={2} stroke={C.ink2} strokeWidth={1.5} />
              <Path d="M2.6 8.6h14.8" stroke={C.ink2} strokeWidth={1.5} />
            </>
          ) : (
            <>
              <Circle cx={10} cy={10} r={7.2} stroke={C.ink2} strokeWidth={1.5} />
              <Path d="M7.6 7.3h4.2M7.6 9.6h4.2M8.8 12.9l2.6-5.6" stroke={C.ink2} strokeWidth={1.4} strokeLinecap="round" />
            </>
          )}
        </Svg>
      </View>
      <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={f(600, 12, 1.2)}>{title}</Txt>
        <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted2 }]}>{sub}</Txt>
      </View>
      <View style={{ backgroundColor: C.selectedBgAlt, paddingVertical: 5, paddingHorizontal: 7, borderRadius: 5 }}>
        <Txt numberOfLines={1} style={[f(600, 10, 1), { color: C.green }]}>{badge}</Txt>
      </View>
    </View>
  );
}

export default function OffersScreen() {
  const wallet = useApp((s) => s.wallet);
  const walletStr = '$' + (wallet ?? WALLET_BALANCE).toFixed(0);

  return (
    <Screen>
      <ScreenHeader
        variant="tint"
        title="Offers & coupons"
        subtitle="6 live offers · ends Sunday 11pm"
        right={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: '#C8DFA4', borderRadius: 9, height: 32, paddingHorizontal: 10 }}>
            <WalletIcon size={14} />
            <Txt numberOfLines={1} style={[f(700, 11.5, 1), { color: C.forest }]}>{walletStr}</Txt>
          </View>
        }
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 130, gap: 16 }}
        showsVerticalScrollIndicator={false}>
        {/* First order hero */}
        <View style={{ borderRadius: 16, boxShadow: '0 10px 24px rgba(11,61,31,0.22)' }}>
          <Grad preset="wallet" style={{ borderRadius: 16, overflow: 'hidden', padding: 16 }}>
            <View style={{ position: 'absolute', right: -26, top: -26, width: 132, height: 132, borderRadius: 66, backgroundColor: 'rgba(139,224,0,0.16)' }} />
            <View style={{ position: 'absolute', right: 16, bottom: -18, width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(139,224,0,0.1)' }} />
            <View style={{ gap: 10 }}>
              <Txt numberOfLines={1} style={[f(700, 9.5, 1), { letterSpacing: 0.9, color: C.lime }]}>FIRST ORDER OFFER</Txt>
              <Txt numberOfLines={1} style={[f(800, 28, 1), { color: '#fff', letterSpacing: -0.6 }]}>$5 OFF + free delivery</Txt>
              <Txt style={[f(500, 11.5, 1.4), { color: 'rgba(255,255,255,0.72)' }]}>
                Applies automatically at checkout on your first Spice Kart order.
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 2 }}>
                <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(139,224,0,0.6)', borderRadius: 9, paddingVertical: 8, paddingHorizontal: 11, backgroundColor: 'rgba(139,224,0,0.08)' }}>
                  <Txt numberOfLines={1} style={[f(700, 12.5, 1), { letterSpacing: 1.4, color: C.lime }]}>SPICE5</Txt>
                </View>
                <Tap
                  onPress={() => flash('Code SPICE5 copied')}
                  style={{ height: 34, paddingHorizontal: 14, borderRadius: 9, backgroundColor: C.lime, justifyContent: 'center' }}>
                  <Txt numberOfLines={1} style={[f(700, 12, 1), { color: C.forest }]}>Copy code</Txt>
                </Tap>
              </View>
            </View>
          </Grad>
        </View>

        <View style={{ gap: 9 }}>
          <Txt numberOfLines={1} style={LABEL}>COUPONS FOR YOU</Txt>
          {COUPONS.map((c) => (
            <CouponRow key={c[4]} c={c} />
          ))}
        </View>

        <View style={{ gap: 9 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Txt numberOfLines={1} style={LABEL}>SHOP THE DEALS</Txt>
            <Txt numberOfLines={1} style={[f(400, 10.5, 1), { color: C.muted3 }]}>Ends Sunday</Txt>
          </View>
          <Grid data={OFFERS} columns={2} gap={9} keyOf={(o) => o[0]} renderItem={(o) => <OfferTile o={o} />} />
        </View>

        <View style={{ gap: 9 }}>
          <Txt numberOfLines={1} style={LABEL}>BANK & PAYMENT OFFERS</Txt>
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden', ...cardShadow }}>
            <BankRow icon="card" title="10% off with Visa cards" sub="Max $12 · min spend $40" badge="Auto" />
            <BankRow icon="wallet" title="5% back to Spice Kart Money" sub="On every PayID order" badge="Always on" last />
          </View>
          <Txt style={[f(400, 10, 1.6), { color: C.muted3 }]}>
            One coupon per order. Offers cannot be combined with Spice Kart Money cashback unless stated.
          </Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}
