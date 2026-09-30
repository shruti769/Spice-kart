import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

/** Wallet/amount derived values, mirroring the prototype's `renderVals()`. */
export function useWalletVals() {
  const amountText = useApp((s) => s.amountText);
  const wallet = useApp((s) => s.wallet);
  const n = parseFloat(amountText || '0');
  const amt = isNaN(n) ? 0 : n;
  const bal = wallet ?? 0;
  const amtErr = amt < 5 || amt > 500;
  return {
    amt,
    bal,
    amtErr,
    amountText,
    amountRaw: amountText || '0',
    amountStr: '$' + amt.toFixed(2).replace('.00', ''),
    amountHint: amtErr ? 'Enter between $5 and $500' : 'Minimum $5 · maximum $500 per top-up',
    amountHintColor: amtErr ? C.danger : C.muted2,
    walletStr: '$' + bal.toFixed(2),
    newBalance: '$' + (bal + amt).toFixed(2),
  };
}

/** Fixed bottom action bar (`padding:10px 14px 30px; border-top; shadow`). */
export function Footer({ children }: { children: ReactNode }) {
  const pad = usePad();
  return (
    <View
      style={{
        paddingTop: 10,
        paddingHorizontal: 14,
        paddingBottom: pad.bottom(30),
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: C.divider,
        boxShadow: '0 -6px 18px rgba(16,24,16,0.05)',
        gap: 8,
      }}>
      {children}
    </View>
  );
}

type BtnProps = { label: string; onPress: () => void; onLongPress?: () => void; tone?: 'dark' | 'lime' };

/** 48px primary button — forest (`dark`) or lime. */
export function PrimaryButton({ label, onPress, onLongPress, tone = 'dark' }: BtnProps) {
  const lime = tone === 'lime';
  return (
    <Tap
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      style={{
        height: 48,
        borderRadius: 11,
        backgroundColor: lime ? C.lime : C.forest,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: lime ? '0 6px 14px rgba(107,176,0,0.24)' : '0 6px 14px rgba(11,61,31,0.18)',
      }}
      pressedStyle={{ backgroundColor: lime ? C.limeHover : C.forestHover }}>
      <Txt style={[f(700, 14, 1), { color: lime ? C.forest : '#fff' }]}>{label}</Txt>
    </Tap>
  );
}

/** 42px outlined secondary button. */
export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      style={{
        height: 42,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      pressedStyle={{ backgroundColor: '#FAFBF7' }}>
      <Txt style={f(600, 13, 1)}>{label}</Txt>
    </Tap>
  );
}

/** Uppercase grey section label (`font:600 10.5px/1; letter-spacing:.6px`). */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.6, color: C.muted2 }]}>
      {children}
    </Txt>
  );
}

/** White bordered card (`border-radius:12px; overflow:hidden`). */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[
        { backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden' },
        cardShadow,
        style,
      ]}>
      {children}
    </View>
  );
}

/** 30×30 outlined icon tile used in list rows. */
export function IconBox({ children }: { children: ReactNode }) {
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
      {children}
    </View>
  );
}

export const CardGlyph = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Rect x={2.6} y={5} width={14.8} height={10} rx={2} stroke="#3F3F3B" strokeWidth={1.5} />
    <Path d="M2.6 8.6h14.8" stroke="#3F3F3B" strokeWidth={1.5} />
  </Svg>
);

export const LockGlyph = ({ size = 14 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Rect x={4.6} y={8.6} width={10.8} height={8} rx={2} stroke="#0B7A32" strokeWidth={1.5} />
    <Path d="M7.2 8.6V6.8a2.8 2.8 0 015.6 0v1.8" stroke="#0B7A32" strokeWidth={1.5} />
  </Svg>
);

/** Green "payments are encrypted" note. */
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
      <LockGlyph />
      <Txt style={[f(500, 10.5, 1.4), { color: '#3F5B43', flexShrink: 1 }]}>
        Payments are encrypted and processed securely. Spice Kart never stores your CVV.
      </Txt>
    </View>
  );
}

/** Key/value summary row (`padding:11px 12px; font:400 12px/1.3; color:#6E6E68`). */
export function KV({
  k,
  v,
  weight = 500,
  color = C.ink,
  last,
}: {
  k: string;
  v: string;
  weight?: 500 | 600;
  color?: string;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 14,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.dividerSoft,
      }}>
      <Txt numberOfLines={1} style={[f(400, 12, 1.3), { color: '#6E6E68' }]}>
        {k}
      </Txt>
      <Txt numberOfLines={1} style={[f(weight, 12, 1.3), { color }]}>
        {v}
      </Txt>
    </View>
  );
}
