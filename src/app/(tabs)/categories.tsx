import { ScrollView, View } from 'react-native';

import { CategoryTile } from '@/components/home/category-tile';
import { Grid, Screen, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { CATEGORIES, ETA_MINUTES, PRODUCTS } from '@/data/catalog';

export default function CategoriesScreen() {
  const pad = usePad();
  return (
    <Screen>
      <View style={{ flexShrink: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider, paddingTop: pad.top(54), paddingHorizontal: 14, paddingBottom: 12 }}>
        <Txt style={f(700, 16, 1.2)}>All categories</Txt>
        <Txt style={[f(400, 11.5, 1), { color: C.muted, marginTop: 4 }]}>
          {PRODUCTS.length} products · delivery in {ETA_MINUTES} min
        </Txt>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}>
        <Grid
          data={CATEGORIES}
          columns={3}
          gap={8}
          keyOf={(c) => c.id}
          renderItem={(c) => <CategoryTile c={c} aspect={1} showCount />}
        />
      </ScrollView>
    </Screen>
  );
}
