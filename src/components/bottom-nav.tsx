import { router } from 'expo-router';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import {
  CartIcon,
  NavCatsIcon,
  NavHomeIcon,
  NavOrdersIcon,
  NavSearchIcon,
} from '@/components/icons';
import { Grad, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { ETA_MINUTES, money } from '@/data/catalog';
import { goTab, type TabName } from '@/lib/nav';
import { useTotals } from '@/store/app-store';

const ACTIVE = '#0C2B1A';
const IDLE = '#9BA9A0';

const ITEMS: { name: TabName; label: string; Icon: typeof NavHomeIcon }[] = [
  { name: 'home', label: 'Home', Icon: NavHomeIcon },
  { name: 'categories', label: 'Categories', Icon: NavCatsIcon },
  { name: 'search', label: 'Search', Icon: NavSearchIcon },
  { name: 'orders', label: 'Orders', Icon: NavOrdersIcon },
];

/** Floating "n items · $x — View cart →" bar. */
export function CartBar({ showTotal = true, style }: { showTotal?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTotals();
  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOutDown.duration(160)} style={[{ marginHorizontal: 10, marginBottom: 8 }, style]}>
      <Grad
        preset="cartBar"
        style={{
          borderRadius: 18,
          borderWidth: 1,
          borderColor: '#D5E9B0',
          paddingVertical: 12.5,
          paddingHorizontal: 13,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          boxShadow: '0 10px 24px rgba(28,60,20,0.14)',
        }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' }}>
          <CartIcon size={18} />
        </View>
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={[f(700, 14, 1.2), { color: C.forest }]}>
            {t.n + (t.n === 1 ? ' item' : ' items')}
            {showTotal && ' · ' + money(t.total)}
          </Txt>
          <Txt numberOfLines={1} style={[f(500, 11.5, 1.2), { color: C.greenMuted }]}>
            Arriving in {ETA_MINUTES} minutes
          </Txt>
        </View>
        <Tap
          onPress={() => router.push('/cart')}
          pressedStyle={{ backgroundColor: C.forestHover }}
          style={{ marginLeft: 'auto', height: 36, paddingHorizontal: 16, borderRadius: 12, backgroundColor: C.forest, justifyContent: 'center', boxShadow: '0 4px 10px rgba(11,61,31,0.2)' }}>
          <Txt style={[f(700, 14, 1.2), { color: '#fff' }]}>View cart →</Txt>
        </Tap>
      </Grad>
    </Animated.View>
  );
}

/**
 * Bottom navigation (+ cart bar) overlaid at the bottom of Home, Categories, Search,
 * Orders, product lists and order tracking.
 */
export function BottomNav({ active, showCartBar = true }: { active: TabName | null; showCartBar?: boolean }) {
  const pad = usePad();
  const t = useTotals();
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 40 }} pointerEvents="box-none">
      {showCartBar && t.n > 0 && <CartBar />}
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: C.divider,
          boxShadow: '0 -6px 18px rgba(16,24,16,0.05)',
          paddingTop: 17,
          paddingHorizontal: 4,
          paddingBottom: pad.bottom(24),
        }}>
        {ITEMS.map(({ name, label, Icon }) => {
          const color = name === active ? ACTIVE : IDLE;
          return (
            <Tap
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: name === active }}
              onPress={() => goTab(name)}
              pressedStyle={{ opacity: 0.6 }}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Icon color={color} />
              <Txt style={[f(500, 10, 1.2), { color }]}>{label}</Txt>
            </Tap>
          );
        })}
      </View>
    </View>
  );
}
