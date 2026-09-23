import type { ReactNode } from 'react';
import { View } from 'react-native';

import { BackIcon } from '@/components/icons';
import { Grad, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { goBack } from '@/lib/nav';

type Props = {
  title: string;
  subtitle?: string;
  /**
   * `plain`: white bar, `border-bottom:1px solid #EDEDE9; padding:52px 14px 10px` (cart, checkout…)
   * `tint`: green gradient bar, `padding:52px 14px 12px` (wallet, account, help…)
   */
  variant?: 'plain' | 'tint';
  right?: ReactNode;
  onBack?: () => void;
  /** Gap between the title and subtitle (prototype uses 2px on plain, 3px on tint). */
  gap?: number;
};

/** Standard back-button header used by pushed screens. */
export function ScreenHeader({ title, subtitle, variant = 'plain', right, onBack = goBack, gap }: Props) {
  const pad = usePad();
  const tint = variant === 'tint';
  const content = (
    <>
      <Tap
        accessibilityLabel="Back"
        onPress={onBack}
        hitSlop={8}
        style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
        <BackIcon color={tint ? C.forest : C.ink} />
      </Tap>
      <View style={{ gap: gap ?? (tint ? 3 : 2), flexShrink: 1 }}>
        <Txt numberOfLines={1} style={[f(700, 15.5, 1.2), { color: tint ? C.forest : C.ink }]}>
          {title}
        </Txt>
        {!!subtitle && (
          <Txt numberOfLines={1} style={[f(400, 11, 1), { color: tint ? C.greenMuted : C.muted }]}>
            {subtitle}
          </Txt>
        )}
      </View>
      {right && <View style={{ marginLeft: 'auto' }}>{right}</View>}
    </>
  );
  const box = {
    paddingTop: pad.top(52),
    paddingHorizontal: 14,
    paddingBottom: tint ? 12 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
  } as const;

  return tint ? (
    <Grad preset="header" style={[box, { borderBottomColor: '#DFE8CD' }]}>
      {content}
    </Grad>
  ) : (
    <View style={[box, { backgroundColor: '#fff', borderBottomColor: C.divider }]}>{content}</View>
  );
}
