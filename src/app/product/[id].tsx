import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { BackIcon, ShieldIcon } from '@/components/icons';
import { ProductCard } from '@/components/product-card';
import { HeaderCartButton } from '@/components/shop/header-cart-button';
import { Grad, Grid, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, cssAngle, f } from '@/constants/theme';
import { ETA_MINUTES, PRODUCTS, byNames, discountPct, findProduct, money } from '@/data/catalog';
import { goBack } from '@/lib/nav';
import { useApp } from '@/store/app-store';

const RELATED = byNames(['White Sandwich Loaf', 'Free Range Eggs', 'Mother Dairy Salted Butter', 'Greek Yoghurt']);

/** Small grey/green chip under the title (`padding:5px 8px;border-radius:5px`). */
function Pill({ children, green }: { children: string; green?: boolean }) {
  return (
    <View style={{ backgroundColor: green ? C.selectedBgAlt : '#F1F2EE', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 5 }}>
      <Txt numberOfLines={1} style={[f(green ? 600 : 500, 11.5, 1), { color: green ? C.green : C.ink2 }]}>
        {children}
      </Txt>
    </View>
  );
}

/** Trust tile in the 3-column row. */
function Perk({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 6, borderWidth: 1, borderColor: C.borderSoft, borderRadius: 9, backgroundColor: '#fff' }}>
      {icon}
      <Txt style={[f(500, 9.5, 1.2), { color: '#5F5F5A', textAlign: 'center' }]}>{label}</Txt>
    </View>
  );
}

/** Product detail (prototype `sDetail`). */
export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pad = usePad();
  const prod = findProduct(id) ?? PRODUCTS[0];
  const qty = useApp((s) => s.cart[prod.id] ?? 0);
  const bump = useApp((s) => s.bump);
  const disc = discountPct(prod);
  const inCart = qty > 0;
  const related = RELATED.filter((p) => p.id !== prod.id);

  const perks = [
    { key: 'q', label: 'Quality checked', icon: <ShieldIcon size={20} color={C.green} /> },
    {
      key: 'r',
      label: 'Easy returns',
      icon: (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M4 8.5l8-4 8 4-8 4-8-4z" stroke={C.green} strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M4 8.5v7l8 4 8-4v-7" stroke={C.green} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      ),
    },
    {
      key: 'd',
      label: `${ETA_MINUTES} min delivery`,
      icon: (
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Circle cx={12} cy={12} r={8} stroke={C.green} strokeWidth={1.6} />
          <Path d="M12 7.5V12l3 2" stroke={C.green} strokeWidth={1.6} strokeLinecap="round" />
        </Svg>
      ),
    },
  ];

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
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
        <Tap
          accessibilityLabel="Back"
          onPress={goBack}
          hitSlop={8}
          style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <BackIcon />
        </Tap>
        <Txt numberOfLines={1} style={[f(600, 14, 1.2), { flex: 1, minWidth: 0 }]}>
          {prod.name}
        </Txt>
        <HeaderCartButton />
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Grad colors={['#F3F7EC', '#FAFBF6']} {...cssAngle(165)} style={{ height: 300 }}>
          <Image
            source={typeof prod.img === 'string' ? { uri: prod.img } : prod.img}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
            accessibilityLabel={prod.name}
            style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
          />
          {disc > 0 && (
            <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: C.lime, paddingVertical: 7, paddingHorizontal: 9, borderRadius: 6 }}>
              <Txt style={[f(800, 11, 1), { letterSpacing: 0.4, color: C.forest }]}>{disc}% OFF</Txt>
            </View>
          )}
          <View
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(255,255,255,0.94)',
              borderRadius: 20,
              paddingVertical: 6,
              paddingHorizontal: 11,
            }}>
            <View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: C.lime }} />
            <Txt numberOfLines={1} style={[f(600, 11, 1), { color: C.forest }]}>
              {ETA_MINUTES} min delivery
            </Txt>
          </View>
        </Grad>

        <View style={{ padding: 14, gap: 14 }}>
          <View style={{ gap: 6 }}>
            <Txt numberOfLines={1} style={[f(500, 11, 1), { color: C.muted2 }]}>
              {prod.brand}
            </Txt>
            <Txt accessibilityRole="header" style={f(700, 19, 1.3)}>
              {prod.name}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pill>{prod.weight}</Pill>
              <Pill green>{'★ ' + prod.rating}</Pill>
              <Pill>{prod.out ? 'Out of stock' : 'In stock'}</Pill>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12, borderRadius: 10, backgroundColor: '#F7FAF2', borderWidth: 1, borderColor: '#E4EBD8' }}>
            <Txt style={f(700, 23, 1)}>{money(prod.price)}</Txt>
            {disc > 0 && <Txt style={[f(400, 13, 1), { color: C.muted3, textDecorationLine: 'line-through' }]}>{money(prod.orig)}</Txt>}
            <Txt numberOfLines={1} style={[f(500, 10.5, 1), { marginLeft: 'auto', color: C.muted }]}>
              Incl. all taxes
            </Txt>
          </View>

          <Grid data={perks} columns={3} gap={8} keyOf={(p) => p.key} renderItem={(p) => <Perk icon={p.icon} label={p.label} />} />

          <View style={[{ borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden' }, cardShadow]}>
            {prod.facts.map((fact) => (
              <View key={fact.k} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.dividerSoft }}>
                <Txt style={[f(500, 11, 1.4), { color: C.muted2, width: 74, flexShrink: 0 }]}>{fact.k}</Txt>
                <Txt style={[f(500, 11.5, 1.4), { color: C.ink2, flexShrink: 1 }]}>{fact.v}</Txt>
              </View>
            ))}
          </View>

          <Txt style={f(700, 14, 1)}>Often bought with</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>
            {related.map((p) => (
              <ProductCard key={p.id} p={p} style={{ flexShrink: 0, width: 128 }} />
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={{
          flexShrink: 0,
          paddingTop: 10,
          paddingHorizontal: 14,
          paddingBottom: pad.bottom(30),
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: C.divider,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
        <View style={{ gap: 2 }}>
          <Txt style={f(700, 15, 1)}>{money(prod.price)}</Txt>
          <Txt style={[f(400, 10.5, 1), { color: C.muted }]}>{prod.weight}</Txt>
        </View>
        <Tap
          onPress={() => (inCart ? router.push('/cart') : bump(prod.id, 1))}
          pressedStyle={{ backgroundColor: C.limeHover }}
          style={{
            flex: 1,
            height: 46,
            borderRadius: 11,
            backgroundColor: C.lime,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 14px rgba(107,176,0,0.24)',
          }}>
          <Txt style={[f(700, 14, 1), { color: C.forest }]}>{inCart ? 'Added · view cart' : 'Add to cart'}</Txt>
        </Tap>
      </View>
    </Screen>
  );
}
