import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ChevronDown, SearchIcon } from '@/components/icons';
import { ProductCard } from '@/components/product-card';
import { PromoBanner } from '@/components/promo-banner';
import { Grad, Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { WALLET_BALANCE, findProduct, type Category, type Product } from '@/data/catalog';
import { goTab, openCategory } from '@/lib/nav';
import { useBanners } from '@/lib/remote-banners';
import { useCategories, useProducts } from '@/lib/remote-catalog';
import { useDeliverySettings } from '@/lib/remote-delivery';
import { initialsOf, useAddress, useApp } from '@/store/app-store';




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

/** Sections on Home show this many items; "See all" appears only when there are more. */
const HOME_LIMIT = 6;

function SectionHead({ title, link, onPress, note }: { title: string; link?: string; onPress?: () => void; note?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Txt numberOfLines={1} style={f(700, 17, 1.25)}>{title}</Txt>
      {note ? (
        <Txt numberOfLines={1} style={[f(400, 13, 1.2), { color: C.muted }]}>{note}</Txt>
      ) : (
        !!link && <Tap accessibilityRole="link" onPress={onPress} hitSlop={12} style={styles.seeAll}>
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

/** Category image on its tile colour (admin-uploaded; remote URL). */
function CategoryArt({ c, fit }: { c: Category; fit: 'contain' | 'cover' }) {
  return <Image source={typeof c.img === 'string' ? { uri: c.img } : c.img} contentFit={fit} style={StyleSheet.absoluteFill} />;
}

/** Top rail: every category the admin has created, in their order. */
function CategoryRail({ categories }: { categories: Category[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRail} contentContainerStyle={styles.catRailContent}>
      {categories.map((c) => (
        <Tap key={c.id} onPress={() => openCategory(c.id)} style={styles.catRailItem}>
          <View style={[styles.catRailTile, { backgroundColor: c.bg }]}>
            <CategoryArt c={c} fit="contain" />
          </View>
          <Txt numberOfLines={2} style={[f(500, 11.5, 1.3), { color: C.ink2, textAlign: 'center' }]}>{c.short}</Txt>
        </Tap>
      ))}
    </ScrollView>
  );
}

function ShelfGrid({ categories }: { categories: Category[] }) {
  return (
    <Grid
      data={categories}
      columns={3}
      gap={10}
      rowGap={16}
      keyOf={(c) => c.id}
      style={{ paddingHorizontal: 16 }}
      renderItem={(c) => (
        <Tap onPress={() => openCategory(c.id)} pressedStyle={{ borderColor: C.lime }} style={styles.shelf}>
          <View style={[styles.shelfImage, { backgroundColor: c.bg }]}>
            <CategoryArt c={c} fit="contain" />
          </View>
          <Txt numberOfLines={2} style={[f(600, 13, 1.25), { textAlign: 'center' }]}>{c.name}</Txt>
        </Tap>
      )}
    />
  );
}

export default function HomeScreen() {
  const pad = usePad();
  const { width } = useWindowDimensions();
  const address = useAddress();
  const user = useApp((s) => s.user);
  const wallet = useApp((s) => s.wallet);
  const order = useApp((s) => s.order);
  const products = useProducts();
  const { etaMinutes: eta } = useDeliverySettings();
  const categories = useCategories();
  const topBanners = useBanners('home_top');
  const middleBanners = useBanners('home_middle');

  // All product sections come from Supabase; each is hidden while it has nothing to show.
  const buyAgain = (order?.itemIds ?? []).map(findProduct).filter((p): p is Product => !!p);
  const essentials = products.slice(0, HOME_LIMIT);
  const deals = products.filter((p) => p.orig > p.price).slice(0, 4);

  const addrLabel = address.label + ' • ' + address.area;
  const walletStr = '$' + (wallet ?? WALLET_BALANCE).toFixed(0);

  return (
    <Screen>
      <Grad preset="header" style={[styles.header, { paddingTop: pad.top(48) }]}>
        <View style={styles.headerRow}>
          <Tap onPress={() => router.push('/location')} style={styles.headerInfo}>
            <Txt numberOfLines={1} style={[f(700, 14, 1.25), { color: C.greenOk }]}>SpiceKart</Txt>
            <Txt numberOfLines={1} style={[f(700, 17, 1.25), { color: C.greenDeep }]}>Delivery in {eta} minutes</Txt>
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
        {categories.length > 0 && <CategoryRail categories={categories} />}

        {topBanners.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.banners}>
            {topBanners.map((b, i) => <PromoBanner key={b.id} b={b} index={i} />)}
          </ScrollView>
        )}

        {buyAgain.length > 0 && (
          <>
            <SectionHead title="Buy again" note="From your last order" />
            <Rail items={buyAgain} cardWidth={118} />
          </>
        )}

        {middleBanners.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.middleBanners}>
            {middleBanners.map((b, i) => <PromoBanner key={b.id} b={b} index={i + 1} width={middleBanners.length === 1 ? width - 32 : 282} />)}
          </ScrollView>
        )}

        {categories.length > 0 && (
          <>
            <SectionHead title="Shop by category" link={categories.length > HOME_LIMIT ? 'See all' : undefined} onPress={goCats} />
            <ShelfGrid categories={categories.slice(0, HOME_LIMIT)} />
          </>
        )}

        {essentials.length > 0 && (
          <>
            <SectionHead title="Everyday Essentials" link={products.length > HOME_LIMIT ? 'See all' : undefined} onPress={goCats} />
            <Rail items={essentials} cardWidth={118} />
          </>
        )}

        {deals.length > 0 && (
          <>
            <SectionHead title="Deals for you" link="All offers" onPress={goOffers} />
            <Grid
              data={deals}
              columns={2}
              gap={10}
              keyOf={(p) => p.id}
              style={{ paddingHorizontal: 16 }}
              renderItem={(p) => <ProductCard p={p} style={{ flex: 1 }} />}
            />
          </>
        )}
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
  // Same 70pt pitch as before, but the full width goes to the item so two-line labels don't get squeezed.
  catRailContent: { paddingTop: 12, paddingBottom: 14, paddingHorizontal: 13, gap: 0 },
  catRailItem: { flexShrink: 0, width: 70, alignItems: 'center', gap: 6 },
  catRailTile: { width: 54, height: 54, borderRadius: 9, overflow: 'hidden' },

  banners: { paddingTop: 28, paddingHorizontal: 16, gap: 10 },
  middleBanners: { paddingTop: 20, paddingHorizontal: 16, gap: 10 },
  banner: { flexShrink: 0, width: 282, height: 143, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingTop: 28, paddingBottom: 18, paddingHorizontal: 16 },
  // Extra padding (offset by negative margin) so the small link is easy to hit.
  seeAll: { paddingVertical: 6, paddingLeft: 12, marginVertical: -6 },
  rail: { paddingHorizontal: 16, paddingBottom: 4, gap: 10 },

  shelf: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, padding: 8, paddingBottom: 12, gap: 8 },
  shelfImage: { width: '100%', aspectRatio: 1.4, borderRadius: 8, overflow: 'hidden' },
});
