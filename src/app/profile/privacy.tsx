import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import {
  DialogButtons,
  IconBox,
  LinkRow,
  Section,
  StarIcon,
  ToggleRow,
  TrashIcon,
  scrollContent,
} from '@/components/account-forms/parts';
import { CenterDialog } from '@/components/overlays';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp, usePref } from '@/store/app-store';

const ink = C.ink2;

const BellIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path d="M5.6 8.6a4.4 4.4 0 018.8 0v3.4l1.3 2.2H4.3l1.3-2.2V8.6z" stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
    <Path d="M8.4 16.2a1.7 1.7 0 003.2 0" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const MailIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Rect x={2.8} y={4.6} width={14.4} height={10.8} rx={2} stroke={ink} strokeWidth={1.5} />
    <Path d="M3.4 6l6.6 4.6L16.6 6" stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
  </Svg>
);

const PinGlyph = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path d="M10 17.5s5.4-4.7 5.4-8.6A5.4 5.4 0 004.6 8.9c0 3.9 5.4 8.6 5.4 8.6z" stroke={ink} strokeWidth={1.5} />
    <Circle cx={10} cy={8.6} r={1.9} stroke={ink} strokeWidth={1.5} />
  </Svg>
);

const ShieldGlyph = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path d="M10 2.8l5.6 2.3v4.6c0 3.3-2.4 5.7-5.6 7.4-3.2-1.7-5.6-4.1-5.6-7.4V5.1L10 2.8z" stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
  </Svg>
);

const EyeOffIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path d="M2.4 10S5.3 5.4 10 5.4 17.6 10 17.6 10 14.7 14.6 10 14.6 2.4 10 2.4 10z" stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
    <Path d="M4 4l12 12" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const DownloadIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path d="M10 3.4v9M6.4 9.4L10 13l3.6-3.6M4 16h12" stroke={ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DocIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
    <Path d="M5 3.4h6.6L15.5 7v9.6a1 1 0 01-1 1H6a1 1 0 01-1-1V3.4z" stroke={ink} strokeWidth={1.5} strokeLinejoin="round" />
    <Path d="M7.6 10.4h4.4M7.6 13h3" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

/** Privacy & data settings (prototype `sPrivacy`). */
export default function PrivacyScreen() {
  const flash = useApp((s) => s.flash);
  const userEmail = useApp((s) => s.user.email);
  const toggle = useApp((s) => s.togglePref);
  const push = usePref('push', true);
  const email = usePref('email', true);
  const marketing = usePref('marketing', false);
  const loc = usePref('loc', true);
  const share = usePref('share', true);
  const sens = usePref('sens', true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const close = () => setDeleteOpen(false);

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Privacy & data" subtitle="Control what you share" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={scrollContent} showsVerticalScrollIndicator={false}>
        <Section label="COMMUNICATIONS">
          <ToggleRow icon={<BellIcon />} title="Push notifications" sub="Order updates, delivery alerts and arrival times" value={push} onToggle={() => toggle('push', true)} />
          <ToggleRow icon={<MailIcon />} title="Email updates" sub="Receipts, order summaries and account notices" value={email} onToggle={() => toggle('email', true)} />
          <ToggleRow icon={<StarIcon />} title="Marketing & offers" sub="Deals, coupons and new-product news" value={marketing} onToggle={() => toggle('marketing', false)} />
        </Section>

        <Section label="DATA & PERMISSIONS">
          <ToggleRow icon={<PinGlyph />} title="Location access" sub="Used to find your address and estimate delivery" value={loc} onToggle={() => toggle('loc', true)} />
          <ToggleRow icon={<ShieldGlyph />} title="Personalised recommendations" sub="Uses your order history to suggest items" value={share} onToggle={() => toggle('share', true)} />
          <ToggleRow icon={<EyeOffIcon />} title="Hide sensitive items" sub="Blur personal-care items in orders" value={sens} onToggle={() => toggle('sens', true)} />
        </Section>

        <Section label="YOUR DATA">
          <LinkRow icon={<DownloadIcon />} title="Download personal data" sub="A copy is emailed within 48 hours" onPress={() => (userEmail ? flash('We’ll email a copy to ' + userEmail + ' within 48 hours') : flash('Add an email in Personal details to receive your data'))} />
          <LinkRow icon={<DocIcon />} title="Privacy policy" sub="How we collect and use your data" onPress={() => router.push('/policy')} />
        </Section>

        <Tap
          onPress={() => setDeleteOpen(true)}
          accessibilityRole="button"
          pressedStyle={{ backgroundColor: '#FAEDE9' }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            borderWidth: 1,
            borderColor: '#EEDAD5',
            backgroundColor: '#FDF7F5',
            borderRadius: 12,
            padding: 12,
          }}>
          <IconBox border="#EBD3CD">
            <TrashIcon />
          </IconBox>
          <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
            <Txt numberOfLines={1} style={[f(600, 12.5, 1.2), { color: C.danger }]}>
              Delete account
            </Txt>
            <Txt style={[f(400, 10.5, 1.3), { color: '#9A7A73' }]}>Permanently removes your orders, addresses and wallet</Txt>
          </View>
        </Tap>
        <Txt style={[f(400, 10, 1.6), { color: C.muted3 }]}>
          Turning off location will stop live delivery tracking and address autofill. You can change these settings any time.
        </Txt>
      </ScrollView>

      <CenterDialog
        visible={deleteOpen}
        onClose={close}
        style={{
          width: '100%',
          backgroundColor: '#fff',
          borderRadius: 16,
          padding: 18,
          gap: 11,
          boxShadow: '0 20px 44px rgba(0,0,0,0.22)',
        }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            backgroundColor: '#FDF0EC',
            borderWidth: 1,
            borderColor: '#EEDAD5',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <DocIcon />
        </View>
        <Txt style={f(700, 15.5, 1.3)}>Delete your account?</Txt>
        <Txt style={[f(400, 12, 1.6), { color: C.muted }]}>
          This permanently removes your order history, saved addresses and any remaining Spice Kart Money. It cannot be undone.
        </Txt>
        <DialogButtons cancel="Keep account" confirm="Delete" onCancel={close} onConfirm={close} height={44} size={12.5} />
      </CenterDialog>
    </Screen>
  );
}
