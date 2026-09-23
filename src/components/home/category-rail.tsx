import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import type { CategoryId } from '@/data/catalog';
import { openCategory } from '@/lib/nav';

type Def = { id: CategoryId; label: string; bg: string; fg: string; icon: (c: string) => ReactNode };

/** Home quick-category chips (label, tile bg, icon colour and 24×24 glyph copied from the prototype). */
const DEFS: Def[] = [
  {
    id: 'dairy', label: 'Dairy', bg: '#E9EFF8', fg: '#274C82',
    icon: (c) => (
      <>
        <Path d="M8 9.5l4-5.5 4 5.5V20H8V9.5z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M8 9.5h8M8 13h8" stroke={c} strokeWidth={1.4} />
      </>
    ),
  },
  {
    id: 'bakery', label: 'Bakery', bg: '#F7EFE0', fg: '#8A6120',
    icon: (c) => (
      <>
        <Path d="M4 12c0-2.8 3.6-5 8-5s8 2.2 8 5c0 1.2-1 2-2 2v3.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 17.5V14c-1 0-2-.8-2-2z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M9.5 10.5v6M14.5 10.5v6" stroke={c} strokeWidth={1.3} />
      </>
    ),
  },
  {
    id: 'produce', label: 'Produce', bg: '#EEF2E9', fg: '#0B5A2A',
    icon: (c) => (
      <>
        <Path d="M11 9l4 4-6.2 6.2a2.5 2.5 0 01-3.5-3.5L11 9z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M13 7.5c1.4-1.6 3.4-2 5.5-1.6-.3 2.1-.8 4-2.4 5.3" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: 'flours', label: 'Flours', bg: '#F5F0E4', fg: '#7A6428',
    icon: (c) => (
      <>
        <Path d="M7 8h10l-1 11a1.5 1.5 0 01-1.5 1.3h-5A1.5 1.5 0 018 19L7 8z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M9 8V5.5A1.5 1.5 0 0110.5 4h3A1.5 1.5 0 0115 5.5V8" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: 'pulses', label: 'Pulses', bg: '#F3EDE0', fg: '#7B5A22',
    icon: (c) => (
      <>
        <Path d="M5 14.5c0-3.6 3-6.5 7-6.5s7 2.9 7 6.5S16 20 12 20s-7-1.9-7-5.5z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Circle cx={9.5} cy={13.5} r={1} fill={c} />
        <Circle cx={13} cy={15} r={1} fill={c} />
        <Path d="M12 8V5" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'spice', label: 'Spices', bg: '#FBEEDD', fg: '#95591A',
    icon: (c) => (
      <>
        <Path d="M8 10h8v8.5a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 018 18.5V10z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M9 10V6.5A1.5 1.5 0 0110.5 5h3A1.5 1.5 0 0115 6.5V10" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Circle cx={10.7} cy={7.4} r={0.85} fill={c} />
        <Circle cx={13.3} cy={7.4} r={0.85} fill={c} />
      </>
    ),
  },
  {
    id: 'grains', label: 'Grains & Rice', bg: '#F1EFE6', fg: '#6A5C33',
    icon: (c) => (
      <>
        <Path d="M12 4c2.6 2.4 4 5.2 4 8.2 0 3.4-1.8 6-4 7.8-2.2-1.8-4-4.4-4-7.8C8 9.2 9.4 6.4 12 4z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M12 6v13" stroke={c} strokeWidth={1.4} />
      </>
    ),
  },
  {
    id: 'oil', label: 'Oil & Ghee', bg: '#FBF4DD', fg: '#8A7016',
    icon: (c) => (
      <>
        <Path d="M9.5 9h5a3 3 0 013 3v6a2 2 0 01-2 2h-7a2 2 0 01-2-2v-6a3 3 0 013-3z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M10.5 9V6h3v3" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M13.5 6l3-1.5" stroke={c} strokeWidth={1.4} strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'snack', label: 'Snacks', bg: '#F8ECEF', fg: '#93384C',
    icon: (c) => (
      <>
        <Circle cx={12} cy={12} r={7.5} stroke={c} strokeWidth={1.6} />
        <Circle cx={10} cy={10} r={1} fill={c} />
        <Circle cx={14} cy={11.5} r={1} fill={c} />
        <Circle cx={11} cy={14.5} r={1} fill={c} />
      </>
    ),
  },
  {
    id: 'instant', label: 'Ready to Eat', bg: '#EDEFF6', fg: '#3E4A82',
    icon: (c) => (
      <>
        <Path d="M4.5 11h15c0 4.4-3.4 7.5-7.5 7.5S4.5 15.4 4.5 11z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M8 8c0-1.4 1-2.2 1-3.2M12 8c0-1.4 1-2.2 1-3.2M16 8c0-1.4 1-2.2 1-3.2" stroke={c} strokeWidth={1.4} strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'tea', label: 'Tea & Drinks', bg: '#EBF1E8', fg: '#3C6640',
    icon: (c) => (
      <>
        <Path d="M5.5 8h11v5a5.5 5.5 0 01-11 0V8z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M16.5 9.5h1.8a2 2 0 010 4h-.8" stroke={c} strokeWidth={1.5} strokeLinejoin="round" />
        <Path d="M6 20.5h11" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'condiments', label: 'Pickles', bg: '#FBEBE4', fg: '#93451F',
    icon: (c) => (
      <>
        <Path d="M8 9h8v9.5a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 018 18.5V9z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M9.5 9V6.5h5V9" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M8 12.5h8" stroke={c} strokeWidth={1.4} />
      </>
    ),
  },
  {
    id: 'sweeteners', label: 'Sweet & Baking', bg: '#F6ECF3', fg: '#7A3866',
    icon: (c) => (
      <>
        <Path d="M5 12.5c0-1.4 1.1-2.5 2.5-2.5h9c1.4 0 2.5 1.1 2.5 2.5v6.5H5v-6.5z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M8 10c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={c} strokeWidth={1.5} strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: 'frozen', label: 'Frozen', bg: '#E6F1F3', fg: '#256069',
    icon: (c) => (
      <>
        <Path d="M12 4v16M5 8l14 8M19 8L5 16" stroke={c} strokeWidth={1.6} strokeLinecap="round" />
        <Path d="M9.5 5.5L12 8l2.5-2.5M9.5 18.5L12 16l2.5 2.5" stroke={c} strokeWidth={1.4} strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: 'fasting', label: 'Fasting', bg: '#EEEAF7', fg: '#4C3E86',
    icon: (c) => (
      <>
        <Circle cx={12} cy={12} r={7.5} stroke={c} strokeWidth={1.6} />
        <Path d="M12 7.5v9M7.5 12h9" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'general', label: 'General', bg: '#EDEFEB', fg: '#4A564E',
    icon: (c) => (
      <>
        <Path d="M5 8h14l-1.2 11a1.5 1.5 0 01-1.5 1.3H7.7A1.5 1.5 0 016.2 19L5 8z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M9 8V6a3 3 0 016 0v2" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
      </>
    ),
  },
  {
    id: 'pooja', label: 'Pooja', bg: '#FBEDE6', fg: '#A2461F',
    icon: (c) => (
      <>
        <Path d="M12 4c1.6 1.8 2.4 3.2 2.4 4.6A2.4 2.4 0 0112 11a2.4 2.4 0 01-2.4-2.4C9.6 7.2 10.4 5.8 12 4z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
        <Path d="M6 13.5h12l-1.4 5.2a1.5 1.5 0 01-1.45 1.1H8.85a1.5 1.5 0 01-1.45-1.1L6 13.5z" stroke={c} strokeWidth={1.6} strokeLinejoin="round" />
      </>
    ),
  },
];

/** White horizontal rail of category chips at the top of Home. */
export function CategoryRail() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider }}
      contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 14, gap: 8 }}>
      {DEFS.map((d) => (
        <Tap key={d.id} onPress={() => openCategory(d.id)} style={{ flexShrink: 0, width: 64, alignItems: 'center', gap: 6 }}>
          <View style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: d.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
              {d.icon(d.fg)}
            </Svg>
          </View>
          <Txt style={[f(500, 9.5, 1.25), { color: C.ink2, textAlign: 'center' }]}>{d.label}</Txt>
        </Tap>
      ))}
    </ScrollView>
  );
}
