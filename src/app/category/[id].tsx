import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { BottomNav } from '@/components/bottom-nav';
import { BackIcon } from '@/components/icons';
import { BottomSheet } from '@/components/overlays';
import { ProductCard } from '@/components/product-card';
import { HeaderCartButton } from '@/components/shop/header-cart-button';
import { Grad, Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cssAngle, f } from '@/constants/theme';
import { PRODUCTS, findCategory } from '@/data/catalog';
import { goBack } from '@/lib/nav';
import { sortAndFilter, useApp, useTotals, type PriceFilter, type SortOption } from '@/store/app-store';

const SORT_OPTIONS: SortOption[] = ['Recommended', 'Price: Low to High', 'Price: High to Low', 'Popular', 'New'];
const PRICE_FILTERS: [Exclude<PriceFilter, null>, string][] = [
  ['u5', 'Under $5'],
  ['5to10', '$5 – $10'],
  ['o10', 'Over $10'],
];
const SKELETONS = [1, 2, 3, 4, 5, 6];
const OFF_BORDER = 'rgba(12,43,26,0.12)';

/** Tile of `linear-gradient(90deg,#F2F2EF 25%,#E8E8E4 50%,#F2F2EF 75%)` with `background-size:220px`. */
const TILE = 220;

/** Skeleton card with the prototype's `sk-shimmer` sweep. */
function SkeletonCard({ shift }: { shift: SharedValue<number> }) {
  const sweep = useAnimatedStyle(() => ({ transform: [{ translateX: shift.value }] }));
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderSoft, borderRadius: 10, padding: 6 }}>
      <View style={{ aspectRatio: 1, borderRadius: 7, overflow: 'hidden', backgroundColor: '#F2F2EF' }}>
        <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: -TILE * 2, flexDirection: 'row' }, sweep]}>
          {[0, 1, 2, 3].map((i) => (
            <Grad
              key={i}
              colors={['#F2F2EF', '#F2F2EF', '#E8E8E4', '#F2F2EF', '#F2F2EF']}
              locations={[0, 0.25, 0.5, 0.75, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: TILE, height: '100%' }}
            />
          ))}
        </Animated.View>
      </View>
      <View style={{ height: 10, marginTop: 8, borderRadius: 3, backgroundColor: '#EFEFEB' }} />
      <View style={{ height: 10, marginTop: 5, width: '55%', borderRadius: 3, backgroundColor: '#EFEFEB' }} />
      <View style={{ height: 24, marginTop: 10, borderRadius: 6, backgroundColor: '#F2F2EF' }} />
    </View>
  );
}

/** Header chip (`height:30px;padding:0 11px;border-radius:7px`). */
function Chip({ onPress, border, bg, children }: { onPress: () => void; border: string; bg: string; children: ReactNode }) {
  return (
    <Tap
      onPress={onPress}
      style={{
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        height: 30,
        paddingHorizontal: 11,
        borderWidth: 1,
        borderColor: border,
        backgroundColor: bg,
        borderRadius: 7,
      }}>
      {children}
    </Tap>
  );
}

/** Sheet pill (`height:32px;padding:0 12px;border-radius:7px;font:500 12px`). */
function SheetPill({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      style={{
        height: 32,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: on ? C.lime : OFF_BORDER,
        backgroundColor: on ? C.selectedBg : '#fff',
        borderRadius: 7,
        justifyContent: 'center',
      }}>
      <Txt style={f(500, 12, 1)}>{label}</Txt>
    </Tap>
  );
}

/** Product list for a category (prototype `sList`) with Sort / Filter sheets. */
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pad = usePad();
  const cat = findCategory(id);
  const { n } = useTotals();
  const sort = useApp((s) => s.sort);
  const dealsOnly = useApp((s) => s.dealsOnly);
  const availOnly = useApp((s) => s.availOnly);
  const price = useApp((s) => s.price);
  const set = useApp((s) => s.set);

  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<'sort' | 'filter' | null>(null);

  // openCat: sort resets, skeleton for 620ms.
  useEffect(() => {
    useApp.getState().set({ sort: 'Recommended' });
    const t = setTimeout(() => setLoading(false), 620);
    return () => clearTimeout(t);
  }, [id]);

  const shift = useSharedValue(-200);
  useEffect(() => {
    shift.value = withRepeat(withTiming(220, { duration: 1200, easing: Easing.linear }), -1, false);
  }, [shift]);

  const list = useMemo(
    () => sortAndFilter(PRODUCTS.filter((p) => p.cat === id), { sort, dealsOnly, availOnly, price }),
    [id, sort, dealsOnly, availOnly, price],
  );
  const listCount = list.length;
  const filterCountText = dealsOnly || availOnly || price ? ' · on' : '';

  const toggleDeals = () => set({ dealsOnly: !dealsOnly });
  const toggleAvail = () => set({ availOnly: !availOnly });
  const clearFilters = () => {
    set({ dealsOnly: false, availOnly: false, price: null });
    setSheet(null);
  };

  const sheetStyle = {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: pad.bottom(30),
  };

  return (
    <Screen>
      {/* Header */}
      <View
        style={{
          flexShrink: 0,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderBottomColor: C.divider,
          paddingTop: pad.top(52),
          paddingHorizontal: 14,
          paddingBottom: 10,
          gap: 10,
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Tap
            accessibilityLabel="Back"
            onPress={goBack}
            hitSlop={8}
            style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
            <BackIcon />
          </Tap>
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Txt numberOfLines={1} style={[f(700, 15.5, 1.2), { maxWidth: 266 }]}>
              {cat ? cat.name : 'Groceries'}
            </Txt>
            <Txt numberOfLines={1} style={[f(400, 11, 1), { color: C.muted }]}>
              {listCount} products
            </Txt>
          </View>
          <HeaderCartButton count={n} style={{ marginLeft: 'auto' }} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
          <Chip onPress={() => setSheet('sort')} border={C.border} bg="#fff">
            <Svg width={12} height={12} viewBox="0 0 14 14" fill="none">
              <Path d="M2 4h10M4 7h6M6 10h2" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" />
            </Svg>
            <Txt numberOfLines={1} style={f(600, 11.5, 1)}>
              {sort}
            </Txt>
          </Chip>
          <Chip onPress={() => setSheet('filter')} border={C.border} bg="#fff">
            <Svg width={12} height={12} viewBox="0 0 14 14" fill="none">
              <Circle cx={5} cy={4} r={1.7} stroke={C.ink} strokeWidth={1.4} />
              <Circle cx={9} cy={10} r={1.7} stroke={C.ink} strokeWidth={1.4} />
              <Path d="M7 4h5M2 10h5" stroke={C.ink} strokeWidth={1.4} strokeLinecap="round" />
            </Svg>
            <Txt numberOfLines={1} style={f(600, 11.5, 1)}>
              Filter{filterCountText}
            </Txt>
          </Chip>
          <Chip onPress={toggleDeals} border={dealsOnly ? C.lime : OFF_BORDER} bg={dealsOnly ? C.selectedBg : '#fff'}>
            <Txt numberOfLines={1} style={f(600, 11.5, 1)}>
              On offer
            </Txt>
          </Chip>
          <Chip onPress={toggleAvail} border={availOnly ? C.lime : OFF_BORDER} bg={availOnly ? C.selectedBg : '#fff'}>
            <Txt numberOfLines={1} style={f(600, 11.5, 1)}>
              In stock
            </Txt>
          </Chip>
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 14, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        {/* Promo strip */}
        <Grad
          colors={['#F1F9DF', '#FBFDF6']}
          {...cssAngle(100)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginBottom: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 9,
            borderWidth: 1,
            borderColor: '#E1EBCF',
          }}>
          <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9 6.7 19.6l1.1-5.8L3.5 9.7l5.9-.8L12 3.5z"
                stroke={C.forest}
                strokeWidth={1.6}
                strokeLinejoin="round"
              />
            </Svg>
          </View>
          <View style={{ gap: 3, minWidth: 0, flexShrink: 1 }}>
            <Txt numberOfLines={1} style={[f(700, 12, 1.2), { color: C.forest }]}>
              Freshly picked this morning
            </Txt>
            <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: '#5F6B57' }]}>
              Sourced from Victorian growers
            </Txt>
          </View>
          <View style={{ marginLeft: 'auto', backgroundColor: C.lime, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 5 }}>
            <Txt numberOfLines={1} style={[f(700, 10, 1), { color: C.forest }]}>
              20% OFF
            </Txt>
          </View>
        </Grad>

        {loading && (
          <Grid data={SKELETONS} columns={2} gap={9} keyOf={(s) => 'sk' + s} renderItem={() => <SkeletonCard shift={shift} />} />
        )}

        {!loading && listCount > 0 && (
          <Animated.View entering={FadeIn.duration(180)}>
            <Grid data={list} columns={2} gap={9} keyOf={(p) => p.id} renderItem={(p) => <ProductCard p={p} />} />
          </Animated.View>
        )}

        {!loading && listCount === 0 && (
          <Animated.View entering={FadeIn.duration(180)} style={{ alignItems: 'center', gap: 8, paddingVertical: 60, paddingHorizontal: 20 }}>
            <Txt style={[f(700, 15, 1.3), { textAlign: 'center' }]}>No products match those filters</Txt>
            <Txt style={[f(400, 12.5, 1.5), { color: C.muted, maxWidth: 220, textAlign: 'center' }]}>
              Clear a filter to see the rest of this aisle.
            </Txt>
            <Tap
              onPress={clearFilters}
              pressedStyle={{ backgroundColor: C.forestHover }}
              style={{ marginTop: 6, height: 38, paddingHorizontal: 18, borderRadius: 8, backgroundColor: C.forest, justifyContent: 'center' }}>
              <Txt style={[f(600, 12.5, 1), { color: '#fff' }]}>Clear filters</Txt>
            </Tap>
          </Animated.View>
        )}
      </ScrollView>

      <BottomNav active="categories" />

      {/* Sort sheet */}
      <BottomSheet visible={sheet === 'sort'} onClose={() => setSheet(null)} style={[sheetStyle, { gap: 6 }]}>
        <Txt style={[f(700, 13.5, 1), { paddingBottom: 4 }]}>Sort by</Txt>
        {SORT_OPTIONS.map((o) => {
          const on = sort === o;
          return (
            <Tap
              key={o}
              onPress={() => {
                set({ sort: o });
                setSheet(null);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: on ? C.selectedBg : '#fff', borderRadius: 8, padding: 11 }}>
              <View
                style={{
                  width: 15,
                  height: 15,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: on ? C.lime : C.radioOff,
                  backgroundColor: on ? C.lime : 'transparent',
                  flexShrink: 0,
                }}
              />
              <Txt style={f(500, 12.5, 1)}>{o}</Txt>
            </Tap>
          );
        })}
      </BottomSheet>

      {/* Filter sheet */}
      <BottomSheet visible={sheet === 'filter'} onClose={() => setSheet(null)} style={[sheetStyle, { gap: 12 }]}>
        <Txt style={f(700, 13.5, 1)}>Filters</Txt>
        <View style={{ gap: 8 }}>
          <Txt style={[f(600, 10.5, 1), { letterSpacing: 0.5, color: C.muted2 }]}>PRICE</Txt>
          <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
            {PRICE_FILTERS.map(([k, label]) => (
              <SheetPill key={k} label={label} on={price === k} onPress={() => set({ price: price === k ? null : k })} />
            ))}
          </View>
        </View>
        <View style={{ gap: 8 }}>
          <Txt style={[f(600, 10.5, 1), { letterSpacing: 0.5, color: C.muted2 }]}>PREFERENCES</Txt>
          <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
            <SheetPill label="On offer" on={dealsOnly} onPress={toggleDeals} />
            <SheetPill label="In stock only" on={availOnly} onPress={toggleAvail} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, paddingTop: 2 }}>
          <Tap
            onPress={clearFilters}
            style={{ flex: 1, height: 42, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={f(600, 12.5, 1)}>Clear all</Txt>
          </Tap>
          <Tap
            onPress={() => setSheet(null)}
            pressedStyle={{ backgroundColor: C.forestHover }}
            style={{ flex: 2, height: 42, borderRadius: 8, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={[f(700, 12.5, 1), { color: '#fff' }]}>Show {listCount} products</Txt>
          </Tap>
        </View>
      </BottomSheet>
    </Screen>
  );
}
