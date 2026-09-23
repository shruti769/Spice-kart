import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ChevronRight, SearchIcon } from '@/components/icons';
import { Tap, Txt, usePad } from '@/components/ui/primitives';
import { cardShadow, f } from '@/constants/theme';

/** Glyphs used by the help, legal and support screens (paths copied from the prototype). */
export type GlyphName =
  | 'box'
  | 'truck'
  | 'card'
  | 'refund'
  | 'coin'
  | 'pin'
  | 'doc'
  | 'chat'
  | 'mail'
  | 'phone'
  | 'question'
  | 'flag'
  | 'user'
  | 'photo'
  | 'send'
  | 'check';

export function Glyph({
  name,
  size = 15,
  color = '#3F3F3B',
  sw = 1.5,
}: {
  name: GlyphName;
  size?: number;
  color?: string;
  /** Main stroke width. */
  sw?: number;
}) {
  const s = { stroke: color, strokeWidth: sw } as const;
  const vb = name === 'truck' ? '0 0 24 24' : name === 'phone' ? '0 0 18 18' : '0 0 20 20';
  let body: ReactNode = null;
  switch (name) {
    case 'box':
      body = (
        <>
          <Path d="M3.4 6.6L10 3.4l6.6 3.2L10 9.8 3.4 6.6z" {...s} strokeLinejoin="round" />
          <Path d="M3.4 6.6v6.8L10 16.6l6.6-3.2V6.6" {...s} strokeLinejoin="round" />
        </>
      );
      break;
    case 'truck':
      body = (
        <>
          <Path d="M2.5 7.5h10v9h-10v-9z" {...s} strokeLinejoin="round" />
          <Path d="M12.5 10.5H17l3 3v3h-7.5v-6z" {...s} strokeLinejoin="round" />
          <Circle cx={6.5} cy={18} r={1.6} {...s} />
          <Circle cx={16} cy={18} r={1.6} {...s} />
        </>
      );
      break;
    case 'card':
      body = (
        <>
          <Rect x={2.6} y={5} width={14.8} height={10} rx={2} {...s} />
          <Path d="M2.6 8.6h14.8" {...s} />
        </>
      );
      break;
    case 'refund':
      body = (
        <>
          <Path d="M4 10a6 6 0 1 1 2 4.5" {...s} strokeLinecap="round" />
          <Path d="M4 6.4V10h3.6" {...s} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
      break;
    case 'coin':
      body = (
        <>
          <Circle cx={10} cy={10} r={7.2} {...s} />
          <Path d="M7.6 7.3h4.2M7.6 9.6h4.2M8.8 12.9l2.6-5.6" stroke={color} strokeWidth={1.4} strokeLinecap="round" />
        </>
      );
      break;
    case 'pin':
      body = (
        <>
          <Path d="M10 17.5s5.4-4.7 5.4-8.6A5.4 5.4 0 004.6 8.9c0 3.9 5.4 8.6 5.4 8.6z" {...s} />
          <Circle cx={10} cy={8.6} r={1.9} {...s} />
        </>
      );
      break;
    case 'doc':
      body = (
        <>
          <Path d="M5 3.4h6.6L15.5 7v9.6a1 1 0 01-1 1H6a1 1 0 01-1-1V3.4z" {...s} strokeLinejoin="round" />
          <Path d="M7.6 10.4h4.4M7.6 13h3" {...s} strokeLinecap="round" />
        </>
      );
      break;
    case 'chat':
      body = (
        <Path
          d="M3.4 5.6A1.8 1.8 0 015.2 3.8h9.6a1.8 1.8 0 011.8 1.8v5.6a1.8 1.8 0 01-1.8 1.8H8.4L4.6 16v-2.9h-.4a1.8 1.8 0 01-.8-1.5V5.6z"
          {...s}
          strokeLinejoin="round"
        />
      );
      break;
    case 'mail':
      body = (
        <>
          <Rect x={2.8} y={4.6} width={14.4} height={10.8} rx={2} {...s} />
          <Path d="M3.4 6l6.6 4.6L16.6 6" {...s} strokeLinejoin="round" />
        </>
      );
      break;
    case 'phone':
      body = (
        <Path
          d="M4 3h3l1.4 3.4-2 1.3a9 9 0 004 4l1.3-2L15 11.2V14a1 1 0 01-1.1 1A12 12 0 013 4.1 1 1 0 014 3z"
          {...s}
          strokeLinejoin="round"
        />
      );
      break;
    case 'question':
      body = (
        <>
          <Circle cx={10} cy={10} r={7.2} {...s} />
          <Path d="M8.1 8a1.9 1.9 0 013.8.3c0 1.3-1.9 1.5-1.9 2.9" {...s} strokeLinecap="round" />
          <Circle cx={10} cy={14} r={0.9} fill={color} />
        </>
      );
      break;
    case 'flag':
      body = <Path d="M5 3.4v13.2M5 4.6h9.4l-1.6 3 1.6 3H5" {...s} strokeLinejoin="round" />;
      break;
    case 'user':
      body = (
        <>
          <Circle cx={10} cy={7.4} r={3} {...s} />
          <Path d="M4.6 16.5c.9-3 3-4.3 5.4-4.3s4.5 1.3 5.4 4.3" {...s} strokeLinecap="round" />
        </>
      );
      break;
    case 'photo':
      body = (
        <>
          <Rect x={2.8} y={4.6} width={14.4} height={10.8} rx={2} {...s} />
          <Circle cx={7.4} cy={8.4} r={1.3} stroke={color} strokeWidth={1.4} />
          <Path d="M3.4 13.4l4-3.4 4.6 4 2.2-1.8 3.2 2.6" {...s} strokeLinejoin="round" />
        </>
      );
      break;
    case 'send':
      body = <Path d="M3 10l14-6-6 14-2-6-6-2z" {...s} strokeLinejoin="round" />;
      break;
    case 'check':
      body = (
        <>
          <Circle cx={10} cy={10} r={7.2} {...s} />
          <Path d="M7 10.2l2.1 2.1L13.2 8" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
      break;
  }
  return (
    <Svg width={size} height={size} viewBox={vb} fill="none">
      {body}
    </Svg>
  );
}

/** 30×30 outlined icon tile (`border:1px solid #D9D9D4;border-radius:8px`). */
export function IconTile({ name }: { name: GlyphName }) {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderWidth: 1,
        borderColor: '#D9D9D4',
        borderRadius: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
      <Glyph name={name} />
    </View>
  );
}

/** Uppercase section caption (`font:600 10.5px/1;letter-spacing:.6px;color:#8C8C86`). */
export function Caption({ children }: { children: string }) {
  return (
    <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.6, color: '#8C8C86' }]}>
      {children}
    </Txt>
  );
}

/** White rounded card (`border:1px solid #EAEAE6;border-radius:12px` + card shadow). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { backgroundColor: '#fff', borderWidth: 1, borderColor: '#EAEAE6', borderRadius: 12, overflow: 'hidden' },
        cardShadow,
        style,
      ]}>
      {children}
    </View>
  );
}

/** A caption followed by a card (`gap:7px` by default). */
export function Section({ title, gap = 7, children }: { title: string; gap?: number; children: ReactNode }) {
  return (
    <View style={{ gap }}>
      <Caption>{title}</Caption>
      <Card>{children}</Card>
    </View>
  );
}

type RowProps = {
  icon: GlyphName;
  title: string;
  sub?: string;
  /** Title weight (500 for link rows, 600 for action rows). */
  weight?: 500 | 600;
  /** Keep the subtitle on one line (`white-space:nowrap`). */
  subNoWrap?: boolean;
  /** Vertical padding (11 → `11px 12px`, 12 → `12px`). */
  padV?: number;
  right?: ReactNode;
  chevron?: boolean;
  bg?: string;
  onPress?: () => void;
};

/** Standard list row inside a Card (`gap:11px;border-bottom:1px solid #F0F0EC`). */
export function Row({ icon, title, sub, weight = 500, subNoWrap, padV = 11, right, chevron, bg, onPress }: RowProps) {
  return (
    <Tap
      onPress={onPress}
      pressedStyle={{ backgroundColor: '#FAFBF7' }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0EC',
        backgroundColor: bg ?? 'transparent',
        paddingVertical: padV,
        paddingHorizontal: 12,
      }}>
      <IconTile name={icon} />
      <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={f(weight, 12.5, 1.2)}>
          {title}
        </Txt>
        {!!sub && (
          <Txt numberOfLines={subNoWrap ? 1 : undefined} style={[f(400, 10.5, 1.3), { color: '#8C8C86' }]}>
            {sub}
          </Txt>
        )}
      </View>
      {right}
      {chevron && <ChevronRight />}
    </Tap>
  );
}

/** Filter/quick-reply chip (`height:30px;padding:0 11px;border-radius:8px`). */
export function Chip({
  label,
  active,
  size = 11.5,
  onPress,
}: {
  label: string;
  active?: boolean;
  size?: number;
  onPress?: () => void;
}) {
  const box: ViewStyle = {
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: active ? '#0B3D1F' : '#fff',
    borderWidth: active ? 0 : 1,
    borderColor: '#E3E3DE',
  };
  const text = (
    <Txt numberOfLines={1} style={[f(active ? 600 : 500, size, 1.2), { color: active ? '#fff' : '#1F1F1F' }]}>
      {label}
    </Txt>
  );
  return onPress ? (
    <Tap onPress={onPress} style={box}>
      {text}
    </Tap>
  ) : (
    <View style={box}>{text}</View>
  );
}

/** Bottom action bar (`padding:10px 14px 30px;background:#fff;border-top:1px solid #EDEDE9`). */
export function FooterBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const pad = usePad();
  return (
    <View
      style={[
        {
          paddingTop: 10,
          paddingHorizontal: 14,
          paddingBottom: pad.bottom(30),
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#EDEDE9',
          boxShadow: '0 -6px 18px rgba(16,24,16,0.05)',
          gap: 8,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Outlined "Contact support" footer button (`height:42px`). */
export function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      pressedStyle={{ backgroundColor: '#FAFBF7' }}
      style={{
        height: 42,
        borderWidth: 1,
        borderColor: '#E3E3DE',
        borderRadius: 11,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Txt style={[f(600, 13, 1), { color: '#1F1F1F' }]}>{label}</Txt>
    </Tap>
  );
}

/** Fake search field button (`height:46px;border:1px solid #E3E3DE;border-radius:11px`). */
export function SearchButton({ placeholder, onPress }: { placeholder: string; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
          height: 46,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: '#E3E3DE',
          borderRadius: 11,
          backgroundColor: '#fff',
        },
        cardShadow,
      ]}>
      <SearchIcon />
      <Txt numberOfLines={1} style={[f(400, 13, 1), { color: '#A8A8A2' }]}>
        {placeholder}
      </Txt>
    </Tap>
  );
}
