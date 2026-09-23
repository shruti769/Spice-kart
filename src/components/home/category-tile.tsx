import { View } from 'react-native';

import { Photo, Tap, Txt } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import type { Category } from '@/data/catalog';
import { openCategory } from '@/lib/nav';

/** Category card used in the Home "Shop by category" grid and the Categories tab. */
export function CategoryTile({ c, aspect, showCount }: { c: Category; aspect: number; showCount?: boolean }) {
  return (
    <Tap
      onPress={() => openCategory(c.id)}
      pressedStyle={{ borderColor: C.lime }}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: C.borderCard,
        backgroundColor: '#fff',
        borderRadius: 12,
        ...cardShadow,
        padding: 8,
        gap: 6,
      }}>
      <View style={{ width: '100%', aspectRatio: aspect, borderRadius: 6, overflow: 'hidden' }}>
        <Photo source={c.img} style={{ flex: 1, backgroundColor: '#F1F3EE' }} />
      </View>
      <Txt style={f(600, 10.5, 1.3)}>{c.name}</Txt>
      {showCount && <Txt style={[f(400, 9.5, 1), { color: C.muted2 }]}>{c.count} products</Txt>}
    </Tap>
  );
}
