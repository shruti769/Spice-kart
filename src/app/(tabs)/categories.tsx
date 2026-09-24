import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { CATEGORIES, ETA_MINUTES, type Category, type CategoryId } from '@/data/catalog';
import { openCategory } from '@/lib/nav';

/** Tile names and counts exactly as the Categories design shows them. */
const DESIGN: Record<CategoryId, [string, number]> = {
  dairy: ['Dairy & Refrigerated', 12],
  bakery: ['Bakery & Bread', 8],
  produce: ['Fresh Produce', 9],
  flours: ['Flours', 6],
  pulses: ['Pulses & Lentils', 9],
  spice: ['Spices & Masalas', 5],
  grains: ['Grains, Rice & Cereal', 5],
  oil: ['Oil & Ghee', 5],
  snack: ['Snacks & Savouries', 5],
  instant: ['Instant & Ready to eat', 9],
  tea: ['Tea & Beverages', 5],
  condiments: ['Pickles & Paste', 8],
  sweeteners: ['Sweeteners', 8],
  frozen: ['Frozen Fruits & Veg.', 5],
  fasting: ['Fasting Foods', 5],
  general: ['General Foods', 9],
  pooja: ['Pooja/festival', 5],
};
const TOTAL = 65;

function CategoryCard({ c }: { c: Category }) {
  const [name, count] = DESIGN[c.id];
  return (
    <Tap onPress={() => openCategory(c.id)} pressedStyle={{ borderColor: C.lime }} style={styles.card}>
      <View style={[styles.art, { backgroundColor: c.bg }]}>
        <Image source={c.img} contentFit="contain" accessibilityLabel={name} style={styles.basket} />
      </View>
      <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(600, 12.5, 1.25), styles.name]}>{name}</Txt>
      <Txt numberOfLines={1} style={[f(400, 12, 1.25), { color: C.muted }]}>{count} products</Txt>
    </Tap>
  );
}

export default function CategoriesScreen() {
  const pad = usePad();
  return (
    <Screen>
      <View style={[styles.header, { paddingTop: pad.top(56) }]}>
        <Txt style={f(700, 17, 1.2)}>All categories</Txt>
        <Txt style={[f(400, 13, 1.25), { color: C.muted }]}>
          {TOTAL} products · delivery in {ETA_MINUTES} min
        </Txt>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        <Grid data={CATEGORIES} columns={3} gap={10} keyOf={(c) => c.id} renderItem={(c) => <CategoryCard c={c} />} />
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
