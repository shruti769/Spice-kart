import { useNavigation } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';

import { CartBar } from '@/components/bottom-nav';
import { BackIcon } from '@/components/icons';
import { ProductCard } from '@/components/product-card';
import { Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { useProducts } from '@/lib/remote-catalog';
import { newSeed, shuffled } from '@/lib/shuffle';
import { useTotals } from '@/store/app-store';

/** "Shop now" from the Home promo banners: every product, in a new random order each visit. */
export default function ShopScreen() {
  const pad = usePad();
  const { n } = useTotals();
  // Fixed card width so an odd last card stays half-width instead of stretching across the row.
  const cardWidth = (useWindowDimensions().width - 32 - 10) / 2;
  const [seed] = useState(newSeed);
  const all = useProducts();
  const products = useMemo(() => shuffled(all, seed), [all, seed]);

  // Let the slide-in animation run on an empty page, then mount the cards, so opening never stutters.
  const navigation = useNavigation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const fallback = setTimeout(() => setReady(true), 400);
    const unsubscribe = navigation.addListener('transitionEnd' as never, () => setReady(true));
    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, [navigation]);

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: pad.top(52) }]}>
        <Tap accessibilityLabel="Back" onPress={goBack} hitSlop={8} style={styles.back}>
          <BackIcon size={18} />
        </Tap>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={f(700, 17, 1.2)}>Shop now</Txt>
          <Txt numberOfLines={1} style={[f(400, 13, 1.25), { color: C.muted }]}>{products.length} products</Txt>
        </View>
      </View>

      {!ready ? (
        <View style={[styles.content, styles.loading]}>
          <ActivityIndicator color={C.forest} />
        </View>
      ) : (
        // Hundreds of products: a virtualised list renders only what's near the screen.
        <FlatList
          style={styles.content}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          data={products}
          numColumns={2}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => <ProductCard p={item} style={{ width: cardWidth }} />}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Txt style={[f(500, 13, 1.4), styles.empty]}>No products here yet</Txt>}
        />
      )}
      {n > 0 && <CartBar showTotal={false} style={[styles.cartBar, { bottom: pad.bottom(8) }]} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 7, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider },
  back: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, backgroundColor: C.bg },
  loading: { alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 120, gap: 10 },
  row: { gap: 10 },
  empty: { color: C.muted, textAlign: 'center', paddingVertical: 60 },
  cartBar: { position: 'absolute', left: 16, right: 16, marginHorizontal: 0, marginBottom: 0 },
});
