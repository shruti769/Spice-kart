import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { CartBar } from '@/components/bottom-nav';
import { BackIcon } from '@/components/icons';
import { ProductCard } from '@/components/product-card';
import { Grad, Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cssAngle, f } from '@/constants/theme';
import { ETA_MINUTES, PRODUCTS, findCategory, subcategoriesOf, type CategoryId } from '@/data/catalog';
import { goBack } from '@/lib/nav';
import { useCatalogVersion } from '@/lib/remote-catalog';
import { useTotals } from '@/store/app-store';

const SIDEBAR = 79;
const TILE = 53;

/** Dark-green tab on the sidebar's right edge marking the selected sub-category. */
function ActiveMarker() {
  return (
    <Svg width={6} height={58} viewBox="0 0 6 58" style={styles.marker}>
      {/* Flat right edge; the left edge is one smooth curve, 2.3pt wide at the ends and 6pt at the middle. */}
      <Path d="M6 0H3.7Q-3.7 29 3.7 58H6Z" fill={C.forest} />
    </Svg>
  );
}

/** Promo strip at the top of every category: the category's own name and delivery promise. */
function PromoStrip({ name }: { name: string }) {
  const title = name;
  const subtitle = `Delivered in ${ETA_MINUTES} minutes`;
  return (
    <Grad colors={['#F1F9DF', '#FBFDF6']} {...cssAngle(100)} style={styles.strip}>
      <View style={styles.stripIcon}>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.8L12 16.9 6.7 19.6l1.1-5.8L3.5 9.7l5.9-.8L12 3.5z" stroke={C.forest} strokeWidth={1.8} strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={{ gap: 2, minWidth: 0, flexShrink: 1 }}>
        <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(700, 13, 1.25), { color: C.forest }]}>{title}</Txt>
        <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(400, 11.5, 1.25), { color: '#5F6B57' }]}>{subtitle}</Txt>
      </View>
    </Grad>
  );
}

/** Category product list with a sub-category sidebar (All / Vegetables / Fruits …). */
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: CategoryId }>();
  const pad = usePad();
  const catalogVersion = useCatalogVersion((s) => s.version);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- categories are replaced when the admin edits them
  const cat = useMemo(() => findCategory(id), [id, catalogVersion]);
  const { n } = useTotals();
  const [sub, setSub] = useState('All');

  const subs = useMemo(() => (cat ? subcategoriesOf(cat.id) : []), [cat]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- catalogVersion changes when admin products load
  const all = useMemo(() => PRODUCTS.filter((p) => p.cat === id), [id, catalogVersion]);
  const list = useMemo(() => (sub === 'All' ? all : all.filter((p) => p.sub === sub)), [all, sub]);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: pad.top(52) }]}>
        <Tap accessibilityLabel="Back" onPress={goBack} hitSlop={8} style={styles.back}>
          <BackIcon size={18} />
        </Tap>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={f(700, 17, 1.2)}>{cat ? cat.name : 'Groceries'}</Txt>
          <Txt numberOfLines={1} style={[f(400, 13, 1.25), { color: C.muted }]}>{all.length} products</Txt>
        </View>
      </View>

      <View style={styles.body}>
        <ScrollView style={styles.sidebar} contentContainerStyle={{ paddingTop: 54, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {subs.map((s) => {
            const on = s.name === sub;
            return (
              <Tap
                key={s.name}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => setSub(s.name)}
                style={styles.subItem}>
                <View style={[styles.subTile, { backgroundColor: s.bg }]}>
                  <Image source={s.img} contentFit="contain" style={StyleSheet.absoluteFill} />
                </View>
                <Txt numberOfLines={2} style={[f(500, 12, 1.3), styles.subLabel]}>{s.name}</Txt>
                {on && <ActiveMarker />}
              </Tap>
            );
          })}
        </ScrollView>

        <View style={styles.content}>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {cat && <PromoStrip name={cat.name} />}
            <Animated.View key={sub} entering={FadeIn.duration(180)}>
              {list.length > 0 ? (
                <Grid data={list} columns={2} gap={13} rowGap={10} keyOf={(p) => p.id} renderItem={(p) => <ProductCard p={p} tall style={{ flex: 1 }} />} />
              ) : (
                <Txt style={[f(500, 13, 1.4), styles.empty]}>No products here yet</Txt>
              )}
            </Animated.View>
          </ScrollView>
          {n > 0 && <CartBar showTotal={false} style={[styles.cartBar, { bottom: pad.bottom(56) }]} />}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 7, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider },
  back: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row' },

  sidebar: { flexGrow: 0, width: SIDEBAR, backgroundColor: '#fff' },
  // Fixed space under each label (not a fixed row height) so two-line labels don't crowd the next tile.
  subItem: { alignItems: 'center', gap: 5, paddingBottom: 23 },
  subTile: { width: TILE, height: TILE, borderRadius: 9, overflow: 'hidden' },
  subLabel: { color: C.ink2, textAlign: 'center', paddingHorizontal: 4 },
  marker: { position: 'absolute', right: 0, top: -2 },

  content: { flex: 1, backgroundColor: C.bg },
  list: { paddingTop: 9, paddingLeft: 13, paddingRight: 26, paddingBottom: 160 },
  empty: { color: C.muted, textAlign: 'center', paddingVertical: 60 },

  strip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 53, marginBottom: 12, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E1EBCF' },
  stripIcon: { width: 22, height: 22, borderRadius: 5, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  cartBar: { position: 'absolute', left: 11, right: 22, marginHorizontal: 0, marginBottom: 0 },
});
