import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  Card,
  DefaultBadge,
  DialogButtons,
  Footer,
  IconBox,
  TileButton,
  TrashButton,
  scrollContent,
} from '@/components/account-forms/parts';
import { BottomSheet } from '@/components/overlays';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

const PinGlyph = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path d="M10 17.5s5.4-4.7 5.4-8.6A5.4 5.4 0 004.6 8.9c0 3.9 5.4 8.6 5.4 8.6z" stroke={C.ink2} strokeWidth={1.5} />
    <Circle cx={10} cy={8.6} r={1.9} stroke={C.ink2} strokeWidth={1.5} />
  </Svg>
);

const WorkGlyph = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path d="M3.4 6.6L10 3.4l6.6 3.2L10 9.8 3.4 6.6z" stroke={C.ink2} strokeWidth={1.5} strokeLinejoin="round" />
    <Path d="M3.4 6.6v6.8L10 16.6l6.6-3.2V6.6" stroke={C.ink2} strokeWidth={1.5} strokeLinejoin="round" />
  </Svg>
);

const SAVED: { label: string; line: string; icon: ReactNode; isDefault?: boolean }[] = [
  { label: 'Home', line: '12/240 Collins Street, Melbourne VIC 3000', icon: <PinGlyph />, isDefault: true },
  { label: 'Work', line: 'Level 8, 420 Bourke Street, Melbourne VIC 3000', icon: <WorkGlyph /> },
  { label: "Mum's place", line: '6 Rathmines Road, Hawthorn East VIC 3123', icon: <PinGlyph /> },
];

/** Saved addresses (prototype `sAddresses`). */
export default function AddressesScreen() {
  const pad = usePad();
  const flash = useApp((s) => s.flash);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const soon = () => flash('Coming soon');
  const close = () => setConfirmOpen(false);

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Saved addresses" subtitle="3 saved · Melbourne VIC" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={scrollContent} showsVerticalScrollIndicator={false}>
        {SAVED.map((a) => (
          <Card key={a.label} style={{ padding: 12, gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}>
              <IconBox>{a.icon}</IconBox>
              <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <Txt numberOfLines={1} style={f(700, 13, 1.2)}>
                    {a.label}
                  </Txt>
                  {a.isDefault && <DefaultBadge />}
                </View>
                <Txt style={[f(400, 11.5, 1.5), { color: C.muted }]}>{a.line}</Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: C.dividerSoft, paddingTop: 9 }}>
              <TileButton label="Edit" onPress={soon} height={34} radius={9} size={11.5} />
              {!a.isDefault && <TileButton label="Set default" onPress={soon} height={34} radius={9} size={11.5} />}
              <TrashButton label="Delete address" onPress={() => setConfirmOpen(true)} width={38} height={34} radius={9} />
            </View>
          </Card>
        ))}
        <Txt style={[f(400, 10, 1.6), { color: C.muted3 }]}>
          We deliver to Melbourne, Sydney and Brisbane metro suburbs. Delivery windows vary by postcode.
        </Txt>
      </ScrollView>
      <Footer label="+ Add new address" onPress={() => router.push('/addresses/new')} />

      <BottomSheet
        visible={confirmOpen}
        onClose={close}
        dim={0.4}
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingTop: 18,
          paddingHorizontal: 16,
          paddingBottom: pad.bottom(32),
          gap: 11,
        }}>
        <Txt style={f(700, 15, 1.3)}>Remove this address?</Txt>
        <Txt style={[f(400, 12, 1.6), { color: C.muted }]}>
          12/240 Collins Street, Melbourne VIC 3000 will no longer appear at checkout.
        </Txt>
        <DialogButtons cancel="Cancel" confirm="Remove" onCancel={close} onConfirm={close} height={46} size={13} />
      </BottomSheet>
    </Screen>
  );
}
