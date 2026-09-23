import type { ReactNode } from 'react';
import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ChevronRight } from '@/components/icons';
import { Tap, Txt, usePad } from '@/components/ui/primitives';
import { Toggle } from '@/components/ui/toggle';
import { C, cardShadow, f } from '@/constants/theme';

/** Building blocks shared by the address, payment and privacy screens. */

/** Single-line input font without a line-height (keeps the text vertically centred on iOS). */
const inputFont = (w: 400 | 500, size: number) => {
  const { lineHeight: _lh, ...rest } = f(w, size, 1);
  return rest;
};

/** `background:#fff;border:1px solid #EAEAE6;border-radius:12px;overflow:hidden` card. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden' }, cardShadow, style]}>
      {children}
    </View>
  );
}

/** Uppercase section label + card (`gap:7px`). */
export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.6, color: C.muted2 }]}>
        {label}
      </Txt>
      <Card>{children}</Card>
    </View>
  );
}

/** 30×30 outlined icon tile. */
export function IconBox({ children, border = '#D9D9D4' }: { children: ReactNode; border?: string }) {
  return (
    <View
      style={{
        width: 30,
        height: 30,
        borderWidth: 1,
        borderColor: border,
        borderRadius: 8,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
      {children}
    </View>
  );
}

/** Settings row with a 40×23 switch. */
export function ToggleRow({
  icon,
  title,
  sub,
  value,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.dividerSoft,
      }}>
      <IconBox>{icon}</IconBox>
      <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={f(500, 12.5, 1.2)}>
          {title}
        </Txt>
        <Txt style={[f(400, 10.5, 1.35), { color: C.muted2 }]}>{sub}</Txt>
      </View>
      <Toggle value={value} onChange={onToggle} label={'Toggle ' + title} />
    </View>
  );
}

/** Tappable settings row with a trailing chevron (`style-hover: #FAFBF7`). */
export function LinkRow({
  icon,
  title,
  sub,
  value,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      pressedStyle={{ backgroundColor: '#FAFBF7' }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.dividerSoft,
      }}>
      <IconBox>{icon}</IconBox>
      <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={f(500, 12.5, 1.2)}>
          {title}
        </Txt>
        <Txt style={[f(400, 10.5, 1.3), { color: C.muted2 }]}>{sub}</Txt>
      </View>
      {!!value && (
        <Txt numberOfLines={1} style={[f(400, 11, 1), { color: C.muted2 }]}>
          {value}
        </Txt>
      )}
      <ChevronRight />
    </Tap>
  );
}

/** Labelled form input (`height:46px;border-radius:11px;background:#FAFAF8`). */
export function Field({
  label,
  hint,
  active,
  style,
  ...input
}: TextInputProps & { label: string; hint?: string; active?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 6 }, style]}>
      <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.4, color: C.muted2 }]}>
        {label}
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: 46,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: active ? C.lime : C.border,
          borderRadius: 11,
          backgroundColor: active ? '#F9FDF1' : C.field,
        }}>
        <TextInput
          allowFontScaling={false}
          placeholderTextColor={C.muted2}
          selectionColor={C.green}
          {...input}
          style={[inputFont(500, 13.5), { flex: 1, minWidth: 0, padding: 0, color: C.ink }]}
        />
      </View>
      {!!hint && <Txt style={[f(400, 10, 1.35), { color: C.muted3 }]}>{hint}</Txt>}
    </View>
  );
}

/** Search-style input with a leading magnifier (white, `gap:9px`). */
export function SearchField({ placeholder }: { placeholder: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        height: 46,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 11,
        backgroundColor: '#fff',
      }}>
      <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
        <Circle cx={9} cy={9} r={6.2} stroke="#6E6E68" strokeWidth={1.6} />
        <Path d="M13.6 13.6L18 18" stroke="#6E6E68" strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
      <TextInput
        allowFontScaling={false}
        placeholder={placeholder}
        placeholderTextColor="#A8A8A2"
        selectionColor={C.green}
        returnKeyType="search"
        style={[inputFont(400, 13), { flex: 1, minWidth: 0, padding: 0, color: C.ink }]}
      />
    </View>
  );
}

/** Lime `DEFAULT` badge. */
export function DefaultBadge() {
  return (
    <View style={{ backgroundColor: C.lime, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 4 }}>
      <Txt numberOfLines={1} style={[f(700, 9, 1), { letterSpacing: 0.5, color: C.forest }]}>
        DEFAULT
      </Txt>
    </View>
  );
}

/** Small outlined action button used on address and card tiles. */
export function TileButton({ label, onPress, height, radius, size }: { label: string; onPress: () => void; height: number; radius: number; size: number }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      pressedStyle={{ backgroundColor: '#F7F7F4' }}
      style={{
        flex: 1,
        height,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: radius,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Txt numberOfLines={1} style={f(600, size, 1)}>
        {label}
      </Txt>
    </Tap>
  );
}

/** Red-tinted trash button. */
export function TrashButton({ onPress, width, height, radius, label = 'Delete' }: { onPress: () => void; width: number; height: number; radius: number; label?: string }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      pressedStyle={{ backgroundColor: '#FAEDE9' }}
      style={{
        width,
        height,
        borderWidth: 1,
        borderColor: '#EEDAD5',
        borderRadius: radius,
        backgroundColor: '#FDF7F5',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <TrashIcon />
    </Tap>
  );
}

export const TrashIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path
      d="M4.6 5.6h10.8M8 5.6V4.2h4v1.4M6.2 5.6l.7 10a1 1 0 001 .9h4.2a1 1 0 001-.9l.7-10"
      stroke={C.danger}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Star icon used on the "Set as default" rows. */
export const StarIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path d="M10 3.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 14l-4.2 2.2.8-4.7L3.2 8.2l4.7-.7L10 3.2z" stroke={C.ink2} strokeWidth={1.4} strokeLinejoin="round" />
  </Svg>
);

/** Green "payments are encrypted" note with a padlock. */
export function SecureNote() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 11,
        backgroundColor: '#F7FAF2',
        borderWidth: 1,
        borderColor: '#E4EBD8',
      }}>
      <Svg width={14} height={14} viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <Rect x={4.6} y={8.6} width={10.8} height={8} rx={2} stroke={C.green} strokeWidth={1.5} />
        <Path d="M7.2 8.6V6.8a2.8 2.8 0 015.6 0v1.8" stroke={C.green} strokeWidth={1.5} />
      </Svg>
      <Txt style={[f(500, 10.5, 1.4), { color: '#3F5B43', flex: 1 }]}>
        Payments are encrypted and processed securely. Spice Kart never stores your CVV.
      </Txt>
    </View>
  );
}

/** Fixed white footer with the primary forest button. */
export function Footer({ label, onPress }: { label: string; onPress: () => void }) {
  const pad = usePad();
  return (
    <View
      style={{
        flexShrink: 0,
        paddingTop: 10,
        paddingHorizontal: 14,
        paddingBottom: pad.bottom(30),
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: C.divider,
        boxShadow: '0 -6px 18px rgba(16,24,16,0.05)',
        gap: 8,
      }}>
      <Tap
        onPress={onPress}
        accessibilityRole="button"
        pressedStyle={{ backgroundColor: C.forestHover }}
        style={{
          height: 48,
          borderRadius: 11,
          backgroundColor: C.forest,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 14px rgba(11,61,31,0.18)',
        }}>
        <Txt style={[f(700, 14, 1), { color: '#fff' }]}>{label}</Txt>
      </Tap>
    </View>
  );
}

/** Two-button dialog row (`gap:8px;padding-top:4px`). */
export function DialogButtons({
  cancel,
  confirm,
  onCancel,
  onConfirm,
  height,
  size,
}: {
  cancel: string;
  confirm: string;
  onCancel: () => void;
  onConfirm: () => void;
  height: number;
  size: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
      <Tap
        onPress={onCancel}
        accessibilityRole="button"
        pressedStyle={{ backgroundColor: '#F7F7F4' }}
        style={{ flex: 1, height, borderWidth: 1, borderColor: C.border, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={f(600, size, 1)}>{cancel}</Txt>
      </Tap>
      <Tap
        onPress={onConfirm}
        accessibilityRole="button"
        style={{ flex: 1, height, borderRadius: 11, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center' }}>
        <Txt style={[f(700, size, 1), { color: '#fff' }]}>{confirm}</Txt>
      </Tap>
    </View>
  );
}

/** Standard scroll-area padding for these screens: `padding:12px 14px 20px;gap:12px`. */
export const scrollContent = { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 } as const;
