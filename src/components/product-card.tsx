import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Photo, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { discountPct, money, type Product } from '@/data/catalog';
import { openProduct } from '@/lib/nav';
import { useApp } from '@/store/app-store';

/** Lime −/qty/+ stepper used on cards (28px tall). */
export function QtyStepper({ id, qty, height = 28, width = 24 }: { id: string; qty: number; height?: number; width?: number }) {
  const bump = useApp((s) => s.bump);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height, borderRadius: 6, backgroundColor: C.lime, overflow: 'hidden' }}>
      <Tap accessibilityLabel="Decrease quantity" onPress={() => bump(id, -1)} style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={[f(700, 15, 1), { color: C.forest }]}>−</Txt>
      </Tap>
      <Txt style={[f(700, 12, 1), { color: C.forest, minWidth: 12, textAlign: 'center' }]}>{qty}</Txt>
      <Tap accessibilityLabel="Increase quantity" onPress={() => bump(id, 1)} style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={[f(700, 15, 1), { color: C.forest }]}>+</Txt>
      </Tap>
    </View>
  );
}

/** Prototype `SKCard` — the product tile used in rails and grids. */
export function ProductCard({ p, style }: { p: Product; style?: StyleProp<ViewStyle> }) {
  const qty = useApp((s) => s.cart[p.id] ?? 0);
  const bump = useApp((s) => s.bump);
  const disc = discountPct(p);

  return (
    <View
      style={[
        {
          backgroundColor: C.white,
          borderWidth: 1,
          borderColor: C.borderCard,
          borderRadius: 12,
          paddingTop: 6,
          paddingHorizontal: 6,
          paddingBottom: 9,
          gap: 5,
          boxShadow: '0 1px 2px rgba(16,24,16,0.05)',
        },
        style,
      ]}>
      <Tap onPress={() => openProduct(p.id)} pressedStyle={{ opacity: 0.85 }}>
        <View style={{ aspectRatio: 1, borderRadius: 9, overflow: 'hidden', backgroundColor: '#F4F5F2' }}>
          <Photo source={p.img} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          {disc > 0 && (
            <View style={{ position: 'absolute', top: 0, left: 0, backgroundColor: C.forest, paddingVertical: 4, paddingHorizontal: 5, borderBottomRightRadius: 6 }}>
              <Txt style={[f(700, 9, 1), { color: C.lime }]}>{disc}% OFF</Txt>
            </View>
          )}
          {p.out && (
            <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.74)', alignItems: 'center', justifyContent: 'center' }}>
              <Txt style={[f(600, 10, 1), { color: '#6B6B6B' }]}>Out of stock</Txt>
            </View>
          )}
        </View>
      </Tap>
      <Tap onPress={() => openProduct(p.id)} pressedStyle={{ opacity: 0.85 }}>
        <Txt numberOfLines={2} style={[f(600, 12, 1.3), { minHeight: 31 }]}>
          {p.name}
        </Txt>
      </Tap>
      <Txt style={[f(400, 11, 1.2), { color: C.muted }]}>{p.weight}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 1 }}>
        <View>
          <Txt style={f(700, 13, 1.2)}>{money(p.price)}</Txt>
          {disc > 0 && (
            <Txt style={[f(400, 10, 1.3), { color: C.muted3, textDecorationLine: 'line-through' }]}>{money(p.orig)}</Txt>
          )}
        </View>
        {qty > 0 ? (
          <QtyStepper id={p.id} qty={qty} />
        ) : (
          <Tap
            onPress={() => bump(p.id, 1)}
            pressedStyle={{ backgroundColor: C.limeHover }}
            style={{ height: 28, paddingHorizontal: 13, borderWidth: 1, borderColor: C.limeBorder, backgroundColor: C.lime, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={[f(700, 11, 1), { color: C.forest, letterSpacing: 0.3 }]}>ADD</Txt>
          </Tap>
        )}
      </View>
    </View>
  );
}
