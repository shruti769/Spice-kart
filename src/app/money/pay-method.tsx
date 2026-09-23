import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Card, CardGlyph, Footer, IconBox, PrimaryButton, SecureNote, SectionLabel, useWalletVals } from '@/components/money/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

const AppleGlyph = () => (
  <Svg width={15} height={15} viewBox="0 0 18 18" fill="none">
    <Path
      d="M12.4 9.5c0-1.6 1.2-2.6 1.3-2.7-.7-1-1.8-1.2-2.2-1.2-1 0-1.6.5-2 .5s-1-.5-1.8-.5c-1.4 0-2.8 1.2-2.8 3.4 0 1.4.5 2.8 1.2 3.7.5.7.9 1.3 1.6 1.3s.9-.4 1.8-.4 1 .4 1.7.4 1.2-.7 1.7-1.4c-1.2-.5-1.5-1.9-1.5-2.1z"
      fill="#3F3F3B"
    />
    <Path d="M10.9 4.4c.4-.5.7-1.2.6-1.9-.6 0-1.4.4-1.8.9-.4.4-.7 1.1-.6 1.8.7.1 1.4-.3 1.8-.8z" fill="#3F3F3B" />
  </Svg>
);

const GoogleGlyph = () => (
  <Svg width={15} height={15} viewBox="0 0 18 18" fill="none">
    <Path
      d="M9 7.4v3.1h4.3c-.2 1-1.2 3-4.3 3a4.5 4.5 0 010-9c1.3 0 2.2.6 2.7 1l2.1-2A7.4 7.4 0 009 1.5a7.5 7.5 0 100 15c4.3 0 7.2-3 7.2-7.3 0-.6 0-1-.1-1.4H9z"
      fill="#3F3F3B"
    />
  </Svg>
);

type Method = { title: string; sub: string; icon: ReactNode };

const CARDS: Method[] = [
  { title: 'Visa ending 4417', sub: 'Expires 09/28 · default', icon: <CardGlyph /> },
  { title: 'Mastercard ending 8802', sub: 'Expires 03/27', icon: <CardGlyph /> },
];
const FAST: Method[] = [
  { title: 'Apple Pay', sub: 'Fastest · Face ID', icon: <AppleGlyph /> },
  { title: 'Google Pay', sub: 'Linked to your account', icon: <GoogleGlyph /> },
];

function MethodRow({ m, on, onPress }: { m: Method; on: boolean; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        borderBottomWidth: 1,
        borderBottomColor: C.dividerSoft,
        backgroundColor: on ? C.selectedBg : '#fff',
        padding: 12,
      }}
      pressedStyle={{ opacity: 0.85 }}>
      <IconBox>{m.icon}</IconBox>
      <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>
          {m.title}
        </Txt>
        <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted2 }]}>
          {m.sub}
        </Txt>
      </View>
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 9,
          borderWidth: 2,
          borderColor: on ? C.lime : C.radioOff2,
          backgroundColor: on ? C.lime : 'transparent',
          flexShrink: 0,
        }}
      />
    </Tap>
  );
}

/** Choose how to pay for the top-up (prototype `sPayMethod`). */
export default function PayMethodScreen() {
  const { amountStr } = useWalletVals();
  const payIdx = useApp((s) => s.payIdx);
  const set = useApp((s) => s.set);

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Payment method" subtitle={`Adding ${amountStr} to your wallet`} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ gap: 7 }}>
          <SectionLabel>SAVED CARDS</SectionLabel>
          <Card>
            {CARDS.map((m, i) => (
              <MethodRow key={m.title} m={m} on={payIdx === i} onPress={() => set({ payIdx: i })} />
            ))}
          </Card>
        </View>
        <View style={{ gap: 7 }}>
          <SectionLabel>FAST CHECKOUT</SectionLabel>
          <Card>
            {FAST.map((m, i) => (
              <MethodRow key={m.title} m={m} on={payIdx === i + 2} onPress={() => set({ payIdx: i + 2 })} />
            ))}
          </Card>
        </View>
        <Tap
          onPress={() => router.push('/payments/add-card')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            height: 48,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: '#C7C7C1',
            borderRadius: 12,
            backgroundColor: '#fff',
          }}
          pressedStyle={{ borderColor: C.lime }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              backgroundColor: C.selectedBgAlt,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
            <Txt style={[f(700, 15, 1), { color: C.green }]}>+</Txt>
          </View>
          <Txt style={[f(600, 12.5, 1), { color: C.forest }]}>Add a new card</Txt>
        </Tap>
        <SecureNote />
      </ScrollView>
      <Footer>
        <PrimaryButton label="Continue" onPress={() => router.push('/money/confirm')} />
      </Footer>
    </Screen>
  );
}
