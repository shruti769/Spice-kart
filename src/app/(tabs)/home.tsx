import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CategoryRail } from '@/components/home/category-rail';
import { CategoryTile } from '@/components/home/category-tile';
import { ChevronDown, SearchIcon, TruckIcon, WalletIcon } from '@/components/icons';
import { ProductCard } from '@/components/product-card';
import { Grad, Grid, Photo, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import {
  ADDRESSES,
  CATEGORIES,
  ETA_MINUTES,
  FREE_OVER,
  LOCAL,
  WALLET_BALANCE,
  byNames,
  type CategoryId,
  type Product,
} from '@/data/catalog';
import { goTab, openCategory } from '@/lib/nav';
import { useApp } from '@/store/app-store';

const BUY_AGAIN = byNames(['Full Cream Milk', 'Truss Tomatoes', 'Free Range Eggs', 'Sourdough Loaf', 'Baby Spinach', 'Cavendish Bananas']);
const FRESH_PICKS = byNames(['Hass Avocados', 'Strawberries', 'Broccoli', 'Truss Tomatoes']);
const ESSENTIALS = byNames(['White Sandwich Loaf', 'Salted Butter', 'Basmati Rice', 'Penne Pasta', 'Greek Yoghurt', 'Brown Onions']);
const DEALS = byNames(['Tasty Cheese Block', 'Extra Virgin Olive Oil', 'Pink Lady Apples', 'Laundry Liquid']);

const BRANDS: { cat: CategoryId; img: number; badge: string; name: string; sub: string }[] = [
  { cat: 'dairy', img: LOCAL.brandDairy, badge: 'UP TO 25% OFF', name: 'Dairyfields', sub: 'Milk, butter & cheese' },
  { cat: 'spice', img: LOCAL.brandSpice, badge: '10% OFF', name: 'Spice Kart Select', sub: 'Small-batch spices' },
  { cat: 'grains', img: LOCAL.brandPantry, badge: 'BUY 2 SAVE', name: 'Pantry Co', sub: 'Rice, pasta & pulses' },
  { cat: 'bakery', img: LOCAL.brandBakery, badge: '15% OFF', name: "Baker's Row", sub: 'Fresh-baked daily' },
];

const goCats = () => goTab('categories');
const goOffers = () => router.push('/offers');

/** Browser default `<button>` padding kept by the prototype's text links. */
const LINK_PAD = { paddingVertical: 1, paddingHorizontal: 6 } as const;

function SectionHead({ title, link, onPress, note }: { title: string; link?: string; onPress?: () => void; note?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 14, paddingBottom: 8 }}>
      <Txt style={f(700, 15, 1)}>{title}</Txt>
      {note ? (
        <Txt numberOfLines={1} style={[f(400, 11, 1), { color: C.muted }]}>
          {note}
        </Txt>
      ) : (
        <Tap onPress={onPress} hitSlop={8} style={LINK_PAD}>
          <Txt style={[f(600, 11.5, 1), { color: C.green }]}>{link}</Txt>
        </Tap>
      )}
    </View>
  );
}

function Rail({ items }: { items: Product[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 6, gap: 9 }}>
      {items.map((p) => (
        <ProductCard key={p.id} p={p} style={{ flexShrink: 0, width: 132 }} />
      ))}
    </ScrollView>
  );
}

/** Promo banner with a photo on the right and a fading tint behind the copy. */
function PhotoBanner({
  img,
  bg,
  border,
  fade,
  tag,
  tagBg,
  ink,
  sub,
  subInk,
  title,
}: {
  img: number;
  bg: string;
  border: string;
  fade: string;
  tag: string;
  tagBg: string;
  ink: string;
  sub: string;
  subInk: string;
  title: string;
}) {
  return (
    <View style={{ flexShrink: 0, width: 274, height: 98, borderRadius: 11, overflow: 'hidden', backgroundColor: bg, borderWidth: 1, borderColor: border }}>
      <Image source={img} contentFit="cover" style={{ position: 'absolute', right: 0, top: 0, width: 112, height: '100%' }} />
      <Grad
        colors={[bg, bg, fade]}
        locations={[0, 0.74, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 186, paddingVertical: 13, paddingHorizontal: 14, justifyContent: 'center', gap: 6 }}>
        <View style={{ alignSelf: 'flex-start', backgroundColor: tagBg, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 4 }}>
          <Txt numberOfLines={1} style={[f(700, 9.5, 1), { letterSpacing: 0.7, color: ink }]}>
            {tag}
          </Txt>
        </View>
        <Txt style={[f(700, 15, 1.25), { color: ink }]}>{title}</Txt>
        <Txt numberOfLines={1} style={[f(500, 11, 1), { color: subInk }]}>
          {sub}
        </Txt>
      </Grad>
    </View>
  );
}

export default function HomeScreen() {
  const pad = usePad();
  const addr = useApp((s) => s.addr);
  const wallet = useApp((s) => s.wallet);

  const addrLabel = ADDRESSES[addr].label + ' • Melbourne VIC';
  const walletStr = '$' + (wallet ?? WALLET_BALANCE).toFixed(0);

  return (
    <Screen>
      <Grad
        preset="header"
        style={{ flexShrink: 0, borderBottomWidth: 1, borderBottomColor: '#DFE8CD', paddingTop: pad.top(50), paddingHorizontal: 14, paddingBottom: 12, gap: 11 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Tap onPress={() => router.push('/location')} style={{ alignItems: 'flex-start', gap: 3, flexShrink: 1, minWidth: 0 }}>
            <Txt numberOfLines={1} style={[f(800, 13, 1), { color: C.green, letterSpacing: 0.2 }]}>
              SpiceKart
            </Txt>
            <Txt numberOfLines={1} style={[f(700, 13.5, 1), { color: C.forest }]}>
              Delivery in {ETA_MINUTES} minutes
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Txt numberOfLines={1} style={[f(400, 11.5, 1), { color: C.greenMuted }]}>
                {addrLabel}
              </Txt>
              <ChevronDown size={9} />
            </View>
          </Tap>
          <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Tap
              accessibilityLabel="Spice Kart Money"
              onPress={() => router.push('/money')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: '#C8DFA4', backgroundColor: 'rgba(255,255,255,0.75)' }}>
              <WalletIcon size={15} />
              <Txt numberOfLines={1} style={[f(700, 11.5, 1), { color: C.forest }]}>
                {walletStr}
              </Txt>
            </Tap>
            <Tap
              accessibilityLabel="Account"
              onPress={() => router.push('/profile')}
              style={{ width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: '#C8DFA4', backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={[f(700, 12, 1), { color: C.lime }]}>JS</Txt>
            </Tap>
          </View>
        </View>
        <Tap
          onPress={() => goTab('search')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 12, borderRadius: 9, backgroundColor: '#fff' }}>
          <SearchIcon size={16} />
          <Txt numberOfLines={1} style={[f(400, 13, 1), { flex: 1, minWidth: 0, color: C.muted2 }]}>
            Search for groceries, milk, vegetables...
          </Txt>
        </Tap>
      </Grad>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <CategoryRail />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 14, paddingBottom: 4, gap: 10 }}>
          <PhotoBanner
            img={LOCAL.bannerFresh}
            bg="#E7F1DA"
            border="#D8E4C8"
            fade="rgba(231,241,218,0)"
            tag="UP TO 20% OFF"
            tagBg={C.lime}
            ink={C.forest}
            title="Fresh picks for your kitchen"
            sub="Vegetables, fruit & herbs"
            subInk={C.greenMuted}
          />
          <PhotoBanner
            img={LOCAL.bannerStaples}
            bg="#F4EEDE"
            border="#E7DFCA"
            fade="rgba(244,238,222,0)"
            tag="BUY 2 SAVE MORE"
            tagBg="#EBD9A8"
            ink="#4A3A16"
            title="Stock up & save on staples"
            sub="Rice, pasta & pulses"
            subInk="#6B5A31"
          />
          <View style={{ flexShrink: 0, width: 274, height: 98, borderRadius: 11, overflow: 'hidden', backgroundColor: C.forest }}>
            <View style={[StyleSheet.absoluteFill, { paddingVertical: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <Image source={LOCAL.appIcon} style={{ width: 46, height: 46, borderRadius: 11, flexShrink: 0 }} />
              <View style={{ gap: 5, minWidth: 0, flexShrink: 1 }}>
                <Txt style={[f(700, 15, 1.25), { color: '#fff' }]}>Skip the store. Enjoy more.</Txt>
                <Txt numberOfLines={1} style={[f(600, 11, 1), { color: C.lime }]}>
                  Free delivery over ${FREE_OVER}
                </Txt>
              </View>
            </View>
            <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, backgroundColor: C.lime }} />
          </View>
        </ScrollView>

        <SectionHead title="Buy again" note="From your last order" />
        <Rail items={BUY_AGAIN} />

        <Tap
          onPress={goCats}
          style={{ marginTop: 16, marginHorizontal: 14, borderRadius: 10, backgroundColor: C.forest, paddingVertical: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 13 }}>
          <View style={{ width: 42, height: 42, borderRadius: 9, backgroundColor: 'rgba(139,224,0,0.15)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <TruckIcon size={24} />
          </View>
          <View style={{ gap: 5, minWidth: 0, flexShrink: 1 }}>
            <Txt numberOfLines={1} style={[f(800, 19, 1), { letterSpacing: 0.4, color: C.lime }]}>
              FREE DELIVERY
            </Txt>
            <Txt numberOfLines={1} style={[f(500, 11.5, 1), { color: 'rgba(255,255,255,0.72)' }]}>
              on orders above $199
            </Txt>
          </View>
          <View style={{ marginLeft: 'auto', backgroundColor: C.lime, paddingVertical: 9, paddingHorizontal: 11, borderRadius: 6 }}>
            <Txt numberOfLines={1} style={[f(700, 11, 1), { color: C.forest }]}>
              Shop now
            </Txt>
          </View>
        </Tap>

        <SectionHead title="Fresh picks" link="See all" onPress={goCats} />
        <Rail items={FRESH_PICKS} />

        <SectionHead title="Everyday essentials" link="See all" onPress={goCats} />
        <Rail items={ESSENTIALS} />

        <View style={{ gap: 9, paddingHorizontal: 14, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <Txt numberOfLines={1} style={f(700, 15, 1)}>
              Brand deals this week
            </Txt>
            <Tap onPress={goOffers} hitSlop={8} style={LINK_PAD}>
              <Txt numberOfLines={1} style={[f(600, 11.5, 1), { color: C.green }]}>
                All brands
              </Txt>
            </Tap>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 2, gap: 9 }}>
            {BRANDS.map((b) => (
              <Tap
                key={b.name}
                onPress={() => openCategory(b.cat)}
                pressedStyle={{ borderColor: C.lime }}
                style={{ flexShrink: 0, width: 150, borderWidth: 1, borderColor: C.borderCard, backgroundColor: '#fff', borderRadius: 12, ...cardShadow, padding: 9, gap: 8 }}>
                <View style={{ width: '100%', height: 66, borderRadius: 9, overflow: 'hidden' }}>
                  <Photo source={b.img} style={{ flex: 1, backgroundColor: '#F1F3EE' }} />
                  <View style={{ position: 'absolute', bottom: 5, left: 5, backgroundColor: C.lime, paddingVertical: 4, paddingHorizontal: 5, borderRadius: 4 }}>
                    <Txt numberOfLines={1} style={[f(700, 9, 1), { color: C.forest }]}>
                      {b.badge}
                    </Txt>
                  </View>
                </View>
                <Txt numberOfLines={1} style={f(700, 12, 1.2)}>
                  {b.name}
                </Txt>
                <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted }]}>
                  {b.sub}
                </Txt>
              </Tap>
            ))}
          </ScrollView>
        </View>

        <SectionHead title="Deals for you" link="All offers" onPress={goOffers} />
        <Grid
          data={DEALS}
          columns={2}
          gap={9}
          keyOf={(p) => p.id}
          style={{ paddingHorizontal: 14, paddingBottom: 6 }}
          renderItem={(p) => <ProductCard p={p} style={{ flex: 1 }} />}
        />

        <Txt style={[f(700, 15, 1), { paddingTop: 16, paddingHorizontal: 14, paddingBottom: 8 }]}>Shop by category</Txt>
        <Grid
          data={CATEGORIES}
          columns={3}
          gap={8}
          keyOf={(c) => c.id}
          style={{ paddingHorizontal: 14 }}
          renderItem={(c) => <CategoryTile c={c} aspect={1.35} />}
        />
      </ScrollView>
    </Screen>
  );
}
