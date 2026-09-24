import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ChevronDown, SearchIcon } from '@/components/icons';
import { ProductCard } from '@/components/product-card';
import { Grad, Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { ETA_MINUTES, FREE_OVER, LOCAL, WALLET_BALANCE, byNames, type CategoryId, type Product } from '@/data/catalog';
import { goTab, openCategory } from '@/lib/nav';
import { initialsOf, useAddress, useApp } from '@/store/app-store';

const BUY_AGAIN = byNames(['Patanjali Besan', 'Aashirvaad Atta', 'Tata Salt', 'Mother Dairy Salted Butter']);
const ESSENTIALS = byNames(['White Sandwich Loaf', 'Mother Dairy Salted Butter', 'Fortune Basmati Rice', 'Vetta Pasta', 'Greek Yoghurt']);
const DEALS = byNames(['Cheese Block', 'Extra Virgin Olive Oil', 'Pink Lady Apples', 'Laundry Liquid']);

type Shelf = { label: string; cat: CategoryId; img: number };

const GROCERY: Shelf[] = [
  { label: 'Vegetable & Fruits', cat: 'produce', img: require('@/assets/images/home/cats/produce.png') },
  { label: 'Oil, Ghee & Masala', cat: 'oil', img: require('@/assets/images/home/cats/oil.png') },
  { label: 'Flours, Rice & Pulses', cat: 'flours', img: require('@/assets/images/home/cats/flours.png') },
  { label: 'Dairy & Bread', cat: 'dairy', img: require('@/assets/images/home/cats/dairy.png') },
  { label: 'Bakery & Biscuits', cat: 'bakery', img: require('@/assets/images/home/cats/bakery.png') },
  { label: 'Dry Fruits & Cereals', cat: 'grains', img: require('@/assets/images/home/cats/dryfruits.png') },
];
const SNACKS: Shelf[] = [
  { label: 'Chips & Namkeen', cat: 'snack', img: require('@/assets/images/home/cats/chips.png') },
  { label: 'Sweets & Chocolates', cat: 'sweeteners', img: require('@/assets/images/home/cats/sweets.png') },
  { label: 'Tea, Coffee & Milk Drinks', cat: 'tea', img: require('@/assets/images/home/cats/tea.png') },
  { label: 'Instant Food', cat: 'instant', img: require('@/assets/images/home/cats/instant.png') },
  { label: 'Sauces & Spread', cat: 'condiments', img: require('@/assets/images/home/cats/sauces.png') },
  { label: 'Frozen Foods', cat: 'frozen', img: require('@/assets/images/home/cats/frozen.png') },
];
/** Top rail: the same shelves, with shorter labels where the design uses them. */
const RAIL: Shelf[] = [
  { ...GROCERY[0], label: 'Vegetables & Fruits' },
  ...GROCERY.slice(1),
  ...SNACKS,
];

/** Background baked into the basket artwork, so tiles blend with it. */
const BASKET_BG = '#F1FADC';

const goCats = () => goTab('categories');
const goOffers = () => router.push('/offers');

function DollarIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
      <Circle cx={10} cy={10} r={8.2} stroke={C.greenOk} strokeWidth={1.6} />
      <Path d="M12.3 7.4c-.4-.8-1.3-1.2-2.3-1.2-1.3 0-2.2.7-2.2 1.7 0 2.4 4.6 1.2 4.6 3.9 0 1-1 1.8-2.4 1.8-1.1 0-2-.5-2.4-1.3M10 5v1.2M10 13.6v1.3" stroke={C.greenOk} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

function SectionHead({ title, link, onPress, note }: { title: string; link?: string; onPress?: () => void; note?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Txt numberOfLines={1} style={f(700, 17, 1.25)}>{title}</Txt>
      {note ? (
        <Txt numberOfLines={1} style={[f(400, 13, 1.2), { color: C.muted }]}>{note}</Txt>
      ) : (
        <Tap accessibilityRole="link" onPress={onPress} hitSlop={12} style={styles.seeAll}>
          <Txt style={[f(600, 13, 1.2), { color: C.greenOk }]}>{link}</Txt>
        </Tap>
      )}
    </View>
  );
}

function Rail({ items, cardWidth }: { items: Product[]; cardWidth: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
      {items.map((p) => (
        <ProductCard key={p.id} p={p} style={{ flexShrink: 0, width: cardWidth }} />
      ))}
    </ScrollView>
  );
}

function CategoryRail() {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRail} contentContainerStyle={styles.catRailContent}>
      {RAIL.map((s) => (
        <Tap key={s.label} onPress={() => openCategory(s.cat)} style={styles.catRailItem}>
          <View style={styles.catRailTile}>
            <Image source={s.img} contentFit="contain" style={StyleSheet.absoluteFill} />
          </View>
          <Txt numberOfLines={2} style={[f(500, 11.5, 1.3), { color: C.ink2, textAlign: 'center' }]}>{s.label}</Txt>
        </Tap>
      ))}
    </ScrollView>
  );
}

function ShelfGrid({ items }: { items: Shelf[] }) {
  return (
    <Grid
      data={items}
      columns={3}
      gap={10}
      rowGap={16}
      keyOf={(s) => s.label}
      style={{ paddingHorizontal: 16 }}
      renderItem={(s) => (
        <Tap onPress={() => openCategory(s.cat)} pressedStyle={{ borderColor: C.lime }} style={styles.shelf}>
          <View style={styles.shelfImage}>
            <Image source={s.img} contentFit="cover" style={StyleSheet.absoluteFill} />
          </View>
          <Txt numberOfLines={2} style={[f(600, 13, 1.25), { textAlign: 'center' }]}>{s.label}</Txt>
        </Tap>
      )}
    />
  );
}

/** Promo banner with a photo on the right and a fading tint behind the copy. */
function PhotoBanner({ img, bg, border, fade, tag, tagBg, ink, sub, subInk, title }: {
  img: number; bg: string; border: string; fade: string; tag: string; tagBg: string; ink: string; sub: string; subInk: string; title: string;
}) {
  return (
    <View style={[styles.banner, { backgroundColor: bg, borderColor: border }]}>
      <Image source={img} contentFit="cover" style={styles.bannerPhoto} />
      <Grad colors={[bg, bg, fade]} locations={[0, 0.72, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.bannerCopy}>
        <View style={[styles.bannerTag, { backgroundColor: tagBg }]}>
          <Txt numberOfLines={1} style={[f(700, 11, 1.2), { letterSpacing: 1, color: ink }]}>{tag}</Txt>
        </View>
        <Txt numberOfLines={2} style={[f(700, 16.5, 1.2), { color: ink }]}>{title}</Txt>
        <Txt numberOfLines={1} style={[f(400, 13, 1.2), { color: subInk }]}>{sub}</Txt>
      </Grad>
    </View>
  );
}

export default function HomeScreen() {
  const pad = usePad();
  const { width } = useWindowDimensions();
  const address = useAddress();
  const user = useApp((s) => s.user);
  const wallet = useApp((s) => s.wallet);

  const addrLabel = address.label + ' • ' + address.area;
  const walletStr = '$' + (wallet ?? WALLET_BALANCE).toFixed(0);

  return (
    <Screen>
      <Grad preset="header" style={[styles.header, { paddingTop: pad.top(48) }]}>
        <View style={styles.headerRow}>
          <Tap onPress={() => router.push('/location')} style={styles.headerInfo}>
            <Txt numberOfLines={1} style={[f(700, 14, 1.25), { color: C.greenOk }]}>SpiceKart</Txt>
            <Txt numberOfLines={1} style={[f(700, 17, 1.25), { color: C.greenDeep }]}>Delivery in {ETA_MINUTES} minutes</Txt>
            <View style={styles.addr}>
              <Txt numberOfLines={1} style={[f(400, 13, 1.25), { color: C.greenMuted }]}>{addrLabel}</Txt>
              <ChevronDown size={10} />
            </View>
          </Tap>
          <View style={styles.headerActions}>
            <Tap accessibilityLabel="Spice Kart Money" onPress={() => router.push('/money')} style={styles.wallet}>
              <DollarIcon />
              <Txt numberOfLines={1} style={[f(700, 14, 1.2), { color: C.forest }]}>{walletStr}</Txt>
            </Tap>
            <Tap accessibilityLabel="Account" onPress={() => router.push('/profile')} style={styles.avatar}>
              {user.avatar ? (
                <Image source={{ uri: user.avatar }} contentFit="cover" style={StyleSheet.absoluteFill} />
              ) : (
                <Txt style={[f(700, 14, 1.2), { color: C.lime }]}>{initialsOf(user)}</Txt>
              )}
            </Tap>
          </View>
        </View>
        <Tap onPress={() => goTab('search')} style={styles.search}>
          <SearchIcon size={19} />
          <Txt numberOfLines={1} style={[f(400, 15, 1.2), styles.searchText]}>Search for groceries, milk, vegetables...</Txt>
        </Tap>
      </Grad>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 175 }} showsVerticalScrollIndicator={false}>
        <CategoryRail />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.banners}>
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
          <View style={[styles.banner, styles.promoBanner]}>
            <Txt numberOfLines={2} style={[f(700, 15, 1.3), { color: '#fff' }]}>Skip the store. Enjoy more.</Txt>
            <Txt numberOfLines={1} style={[f(600, 12, 1.2), { color: C.lime }]}>Free delivery over ${FREE_OVER}</Txt>
            <View style={styles.promoStripe} />
          </View>
        </ScrollView>

        <SectionHead title="Buy again" note="From your last order" />
        <Rail items={BUY_AGAIN} cardWidth={118} />

        <Tap onPress={goCats} style={styles.freeDelivery}>
          <Image source={LOCAL.freeDelivery} contentFit="contain" accessibilityLabel="Free delivery on orders above $199" style={styles.freeDeliveryArt} />
          <View style={styles.shopNow}>
            <Txt numberOfLines={1} style={[f(700, 14, 1.2), { color: C.forest }]}>Shop now</Txt>
          </View>
        </Tap>

        <SectionHead title="Grocery & Kitchen" link="See all" onPress={goCats} />
        <ShelfGrid items={GROCERY} />

        <SectionHead title="Snacks" link="See all" onPress={goCats} />
        <ShelfGrid items={SNACKS} />

        <SectionHead title="Everyday Essentials" link="See all" onPress={goCats} />
        <Rail items={ESSENTIALS} cardWidth={118} />

        <Tap onPress={goOffers} accessibilityLabel="Brand deals, 31 August to 6 September" style={styles.brandDeals}>
          <Image source={LOCAL.brandDeals} contentFit="cover" style={{ width, aspectRatio: 538 / 585 }} />
        </Tap>

        <SectionHead title="Deals for you" link="All offers" onPress={goOffers} />
        <Grid
          data={DEALS}
          columns={2}
          gap={10}
          keyOf={(p) => p.id}
          style={{ paddingHorizontal: 16 }}
          renderItem={(p) => <ProductCard p={p} style={{ flex: 1 }} />}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexShrink: 0, borderBottomWidth: 1, borderBottomColor: '#DFE8CD', paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerInfo: { alignItems: 'flex-start', flexShrink: 1, minWidth: 0 },
  addr: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  headerActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 34, paddingHorizontal: 11, borderRadius: 9, borderWidth: 1, borderColor: '#C8DFA4', backgroundColor: 'rgba(255,255,255,0.8)' },
  avatar: { width: 34, height: 34, borderRadius: 9, overflow: 'hidden', borderWidth: 1, borderColor: '#2B4F30', backgroundColor: C.greenDeep, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 42, paddingHorizontal: 14, borderRadius: 10, backgroundColor: '#fff' },
  searchText: { flex: 1, minWidth: 0, color: C.muted2 },

  catRail: { flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider },
  catRailContent: { paddingTop: 12, paddingBottom: 14, paddingHorizontal: 16, gap: 6 },
  catRailItem: { flexShrink: 0, width: 64, alignItems: 'center', gap: 6 },
  catRailTile: { width: 54, height: 54, borderRadius: 9, overflow: 'hidden', backgroundColor: BASKET_BG },

  banners: { paddingTop: 28, paddingHorizontal: 16, gap: 10 },
  banner: { flexShrink: 0, width: 282, height: 143, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  bannerPhoto: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 150 },
  bannerCopy: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 200, paddingHorizontal: 14, justifyContent: 'center', gap: 8 },
  promoBanner: { width: 225, borderWidth: 0, backgroundColor: C.forest, justifyContent: 'center', paddingLeft: 15, paddingRight: 36, gap: 6 },
  promoStripe: { position: 'absolute', right: 9, top: 21, bottom: 21, width: 6, backgroundColor: C.lime },
  bannerTag: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 4, marginBottom: 2 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 28, paddingBottom: 18, paddingHorizontal: 16 },
  // Extra padding (offset by negative margin) so the small link is easy to hit.
  seeAll: { paddingVertical: 6, paddingLeft: 12, marginVertical: -6 },
  rail: { paddingHorizontal: 16, paddingBottom: 4, gap: 10 },

  freeDelivery: { marginTop: 20, marginHorizontal: 16, height: 89, borderRadius: 10, backgroundColor: '#1B3C22', flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 18, overflow: 'hidden' },
  freeDeliveryArt: { width: 142, height: 61 },
  shopNow: { marginLeft: 'auto', height: 30, paddingHorizontal: 16, borderRadius: 6, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },

  shelf: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, padding: 8, paddingBottom: 12, gap: 8 },
  shelfImage: { width: '100%', aspectRatio: 1.4, borderRadius: 8, overflow: 'hidden', backgroundColor: BASKET_BG },

  brandDeals: { marginTop: 32 },
});
