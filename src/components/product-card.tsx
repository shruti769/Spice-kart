import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Photo, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { discountPct, money, type Product } from '@/data/catalog';
import { openProduct } from '@/lib/nav';
import { useApp } from '@/store/app-store';

/** Lime −/qty/+ stepper used on cards (28px tall). */
export function QtyStepper({ id, qty, height = 29, width = 22 }: { id: string; qty: number; height?: number; width?: number }) {
  const bump = useApp((s) => s.bump);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height, borderRadius: 6, borderWidth: 1, borderColor: C.limeBorder, backgroundColor: C.lime, overflow: 'hidden' }}>
      <Tap accessibilityLabel="Decrease quantity" onPress={() => bump(id, -1)} style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={[f(700, 17, 1.2), { color: C.forest }]}>−</Txt>
      </Tap>
      <Txt style={[f(700, 14, 1.2), { color: C.forest, minWidth: 14, textAlign: 'center' }]}>{qty}</Txt>
      <Tap accessibilityLabel="Increase quantity" onPress={() => bump(id, 1)} style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={[f(700, 17, 1.2), { color: C.forest }]}>+</Txt>
      </Tap>
    </View>
  );
}

/** Prototype `SKCard` — the product tile used in rails and grids. `tall` is the category-list variant. */
export function ProductCard({ p, style, tall }: { p: Product; style?: StyleProp<ViewStyle>; tall?: boolean }) {
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
          paddingTop: 7,
          paddingHorizontal: 7,
          paddingBottom: 9,
          gap: 5,
          boxShadow: '0 1px 2px rgba(16,24,16,0.05)',
        },
        style,
      ]}>
      <Tap onPress={() => openProduct(p.id)} pressedStyle={{ opacity: 0.85 }}>
        <View style={{ aspectRatio: tall ? 123 / 173 : 1, borderRadius: 9, overflow: 'hidden', backgroundColor: '#F4F5F2' }}>
          <Photo source={p.img} crop={typeof p.img === 'string'} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
          {disc > 0 && (
            <View style={{ position: 'absolute', top: 0, left: 0, backgroundColor: C.forest, paddingVertical: 4, paddingHorizontal: 5, borderBottomRightRadius: 6 }}>
              <Txt style={[f(700, 10, 1.2), { color: C.lime }]}>{disc}% OFF</Txt>
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
        <Txt numberOfLines={2} style={[tall ? f(600, 13.5, 1.3) : f(600, 13, 1.3), { minHeight: tall ? 35 : 34, marginTop: tall ? 6 : 3 }]}>
          {p.name}
        </Txt>
      </Tap>
      <Txt style={[f(400, 12, 1.3), { color: C.muted, marginTop: 4 }]}>{p.weight}</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginTop: 1 }}>
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={f(700, tall ? 16 : 15, 1.2)}>{money(p.price)}</Txt>
          {disc > 0 && (
            <Txt style={[f(400, 11, 1.3), { color: C.muted3, textDecorationLine: 'line-through' }]}>{money(p.orig)}</Txt>
          )}
        </View>
        {qty > 0 ? (
          <QtyStepper id={p.id} qty={qty} height={tall ? 28 : 29} width={tall ? 23 : 22} />
        ) : (
          <Tap
            onPress={() => bump(p.id, 1)}
            pressedStyle={{ backgroundColor: C.limeHover }}
            style={{ flexShrink: 0, height: tall ? 28 : 29, paddingHorizontal: tall ? 15 : 12, borderWidth: 1, borderColor: C.limeBorder, backgroundColor: C.lime, borderRadius: 6, alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={[f(700, 13, 1.2), { color: C.forest, letterSpacing: 0.3 }]}>ADD</Txt>
          </Tap>
        )}
      </View>
    </View>
  );
}
