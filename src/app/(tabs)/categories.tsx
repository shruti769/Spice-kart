import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { type Category } from '@/data/catalog';
import { openCategory } from '@/lib/nav';
import { useCategories, useProducts } from '@/lib/remote-catalog';
import { useEtaMinutes } from '@/lib/remote-delivery';


function CategoryCard({ c, count }: { c: Category; count: number }) {
  const name = c.name;
  return (
    <Tap onPress={() => openCategory(c.id)} pressedStyle={{ borderColor: C.lime }} style={styles.card}>
      <View style={[styles.art, { backgroundColor: c.bg }]}>
        <Image source={c.img} contentFit="contain" accessibilityLabel={name} style={styles.basket} />
      </View>
      <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(600, 12.5, 1.25), styles.name]}>{name}</Txt>
      <Txt numberOfLines={1} style={[f(400, 12, 1.25), { color: C.muted }]}>{count} {count === 1 ? 'product' : 'products'}</Txt>
    </Tap>
  );
}

export default function CategoriesScreen() {
  const pad = usePad();
  const eta = useEtaMinutes();
  const products = useProducts();
  const categories = useCategories();
  const total = products.length;
  return (
    <Screen>
      <View style={[styles.header, { paddingTop: pad.top(56) }]}>
        <Txt style={f(700, 17, 1.2)}>All categories</Txt>
        <Txt style={[f(400, 13, 1.25), { color: C.muted }]}>
          {total} {total === 1 ? 'product' : 'products'} · delivery in {eta} min
        </Txt>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Grid data={categories} columns={3} gap={10} keyOf={(c) => c.id} renderItem={(c) => <CategoryCard c={c} count={products.filter((p) => p.cat === c.id).length} />} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexShrink: 0, backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 10, gap: 4 },
  list: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 170 },
  card: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, padding: 8, paddingBottom: 5 },
  art: { width: '100%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
  // The basket sits inside the pastel tile with a small margin, as in the design.
  basket: { position: 'absolute', top: 6, right: 6, bottom: 6, left: 6 },
  name: { marginTop: 5, marginBottom: 3 },
});
