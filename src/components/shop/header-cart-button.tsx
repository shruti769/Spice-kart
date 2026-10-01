import { router } from 'expo-router';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

/** 32×32 cart button used in the list / detail headers, with a count badge (defaults to total items in the cart). */
export function HeaderCartButton({ count, style }: { count?: number; style?: StyleProp<ViewStyle> }) {
  const cartCount = useApp((s) => Object.values(s.cart).reduce((sum, q) => sum + q, 0));
  count ??= cartCount;
  return (
    <Tap
      accessibilityLabel={count > 0 ? `Cart, ${count} items` : 'Cart'}
      onPress={() => router.push('/cart')}
      style={[{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={18} height={18} viewBox="0 0 20 20" fill="none">
        <Path d="M3 4h2l1.8 9.2h8.6L17 6.5H6" stroke={C.ink} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={8} cy={17} r={1.3} fill={C.ink} />
        <Circle cx={15} cy={17} r={1.3} fill={C.ink} />
      </Svg>
      {count > 0 && (
        <Txt
          style={[
            f(700, 9, 1),
            {
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 15,
              height: 15,
              lineHeight: 15,
              paddingHorizontal: 3,
              borderRadius: 8,
              overflow: 'hidden',
              backgroundColor: C.forest,
              color: C.lime,
              textAlign: 'center',
            },
          ]}>
          {count}
        </Txt>
      )}
    </Tap>
  );
}
