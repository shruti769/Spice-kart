import { Image, type ImageSource } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, G } from '@/constants/theme';

/** Text with the prototype defaults (Inter 400, #1F1F1F). Style with `f()` from theme. */
export function Txt({ style, ...rest }: TextProps) {
  return <Text allowFontScaling={false} {...rest} style={[{ color: C.ink, fontFamily: 'Inter_400Regular' }, style]} />;
}

type TapProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Extra style while pressed (defaults to a subtle dim). Mirrors the prototype's hover states. */
  pressedStyle?: StyleProp<ViewStyle>;
};

/** Pressable with light, fast press feedback. */
export function Tap({ style, pressedStyle, ...rest }: TapProps) {
  return (
    <Pressable
      {...rest}
      style={({ pressed }) => [style, pressed && (pressedStyle ?? { opacity: 0.72 })]}
    />
  );
}

type GradProps = {
  preset?: keyof typeof G;
  colors?: readonly [string, string, ...string[]];
  locations?: readonly [number, number, ...number[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** LinearGradient that accepts a preset name from `G`. */
export function Grad({ preset, colors, locations, start, end, style, children }: GradProps) {
  const p = preset ? G[preset] : undefined;
  return (
    <LinearGradient
      colors={colors ?? p!.colors}
      locations={locations ?? p?.locations}
      start={start ?? p?.start ?? { x: 0.5, y: 0 }}
      end={end ?? p?.end ?? { x: 0.5, y: 1 }}
      style={style}>
      {children}
    </LinearGradient>
  );
}

/**
 * Product photo with the prototype's 5% over-crop
 * (`position:absolute;left:-5%;top:-5%;width:110%;height:110%;object-fit:cover`).
 */
export function Photo({
  source,
  style,
  crop = true,
}: {
  source: string | ImageSource | number;
  style?: StyleProp<ViewStyle>;
  crop?: boolean;
}) {
  const src = typeof source === 'string' ? { uri: source } : source;
  return (
    <View style={[{ overflow: 'hidden', backgroundColor: '#F4F5F2' }, style]}>
      <Image
        source={src}
        contentFit="cover"
        transition={180}
        cachePolicy="memory-disk"
        style={
          crop
            ? { position: 'absolute', left: '-5%', top: '-5%', width: '110%', height: '110%' }
            : { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }
        }
      />
    </View>
  );
}

/**
 * The prototype is drawn in a 402×874 iPhone frame whose status bar overlays content
 * (headers use ~50px top padding) and whose home indicator overlays the bottom
 * (~30px bottom padding). These helpers keep those paddings on devices with larger insets.
 */
export function usePad() {
  const insets = useSafeAreaInsets();
  return {
    top: (p: number) => p + Math.max(0, insets.top - 50),
    bottom: (p: number) => p + Math.max(0, insets.bottom - 30),
    insets,
  };
}

/**
 * CSS `display:grid; grid-template-columns: repeat(columns, 1fr); gap`.
 * Items are laid out in equal-width rows; the last row is padded with spacers.
 */
export function Grid<T>({
  data,
  columns,
  gap,
  rowGap = gap,
  renderItem,
  keyOf,
  style,
}: {
  data: T[];
  columns: number;
  gap: number;
  rowGap?: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyOf: (item: T, index: number) => string;
  style?: StyleProp<ViewStyle>;
}) {
  const rows: T[][] = [];
  for (let i = 0; i < data.length; i += columns) rows.push(data.slice(i, i + columns));
  return (
    <View style={[{ gap: rowGap }, style]}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row.map((item, c) => (
            <View key={keyOf(item, r * columns + c)} style={{ flex: 1, minWidth: 0 }}>
              {renderItem(item, r * columns + c)}
            </View>
          ))}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={'pad' + i} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Root container for every screen (`background:#F5F6F3`). */
export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flex: 1, backgroundColor: C.bg }, style]}>{children}</View>;
}
