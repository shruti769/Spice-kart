import { Image } from 'expo-image';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ChevronRight, WalletIcon } from '@/components/icons';
import { Toggle } from '@/components/ui/toggle';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, cssAngle, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';
import { goTab } from '@/lib/nav';
import { logOut } from '@/lib/remote-privacy';
import { greetingName, useApp, usePref, useTotals } from '@/store/app-store';

const S = '#3F3F3B';

/** 15×15 row glyphs (viewBox 0 0 20 20), copied from the prototype. */
const ICONS: Record<string, ReactNode> = {
  person: (
    <>
      <Circle cx={10} cy={7.4} r={3} stroke={S} strokeWidth={1.5} />
      <Path d="M4.6 16.5c.9-3 3-4.3 5.4-4.3s4.5 1.3 5.4 4.3" stroke={S} strokeWidth={1.5} strokeLinecap="round" />
    </>
  ),
  pin: (
    <>
      <Path d="M10 17.5s5.4-4.7 5.4-8.6A5.4 5.4 0 004.6 8.9c0 3.9 5.4 8.6 5.4 8.6z" stroke={S} strokeWidth={1.5} />
      <Circle cx={10} cy={8.6} r={1.9} stroke={S} strokeWidth={1.5} />
    </>
  ),
  card: (
    <>
      <Rect x={2.6} y={5} width={14.8} height={10} rx={2} stroke={S} strokeWidth={1.5} />
      <Path d="M2.6 8.6h14.8" stroke={S} strokeWidth={1.5} />
    </>
  ),
  eye: (
    <>
      <Path d="M2.4 10S5.3 5.4 10 5.4 17.6 10 17.6 10 14.7 14.6 10 14.6 2.4 10 2.4 10z" stroke={S} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M4 4l12 12" stroke={S} strokeWidth={1.5} strokeLinecap="round" />
    </>
  ),
  bell: (
    <>
      <Path d="M5.6 8.6a4.4 4.4 0 018.8 0v3.4l1.3 2.2H4.3l1.3-2.2V8.6z" stroke={S} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M8.4 16.2a1.7 1.7 0 003.2 0" stroke={S} strokeWidth={1.5} strokeLinecap="round" />
    </>
  ),
  shield: <Path d="M10 2.8l5.6 2.3v4.6c0 3.3-2.4 5.7-5.6 7.4-3.2-1.7-5.6-4.1-5.6-7.4V5.1L10 2.8z" stroke={S} strokeWidth={1.5} strokeLinejoin="round" />,
  help: (
    <>
      <Circle cx={10} cy={10} r={7.2} stroke={S} strokeWidth={1.5} />
      <Path d="M8.1 8a1.9 1.9 0 013.8.3c0 1.3-1.9 1.5-1.9 2.9" stroke={S} strokeWidth={1.5} strokeLinecap="round" />
      <Circle cx={10} cy={14} r={0.9} fill={S} />
    </>
  ),
  chat: (
    <Path
      d="M3.4 5.6A1.8 1.8 0 015.2 3.8h9.6a1.8 1.8 0 011.8 1.8v5.6a1.8 1.8 0 01-1.8 1.8H8.4L4.6 16v-2.9h-.4a1.8 1.8 0 01-.8-1.5V5.6z"
      stroke={S}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
  ),
  doc: (
    <>
      <Path d="M5 3.4h6.6L15.5 7v9.6a1 1 0 01-1 1H6a1 1 0 01-1-1V3.4z" stroke={S} strokeWidth={1.5} strokeLinejoin="round" />
      <Path d="M7.6 10.4h4.4M7.6 13h3" stroke={S} strokeWidth={1.5} strokeLinecap="round" />
    </>
  ),
};

type Row = [icon: keyof typeof ICONS, label: string, meta: string];

const ACCOUNT_ROWS: Row[] = [
  ['pin', 'Saved addresses', '2 saved'],
  ['card', 'Payment methods', 'Visa · 4417'],
];
const PREF_ROWS: Row[] = [
  ['bell', 'Notifications', 'On'],
  ['shield', 'Privacy & data', ''],
];
const HELP_ROWS: Row[] = [
  ['help', 'Help centre', 'FAQs & guides'],
  ['chat', 'Contact support', '24/7'],
  ['doc', 'Terms & policies', ''],
];

function IconBox({ name }: { name: keyof typeof ICONS }) {
  return (
    <View style={{ width: 30, height: 30, borderWidth: 1, borderColor: '#D9D9D4', borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
        {ICONS[name]}
      </Svg>
    </View>
  );
}

function LinkRow({ row: [icon, label, meta] }: { row: Row }) {
  return (
    <Tap
      onPress={() => useApp.getState().flash(label + ' — coming soon')}
      pressedStyle={{ backgroundColor: '#FAFBF7' }}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderBottomColor: C.dividerSoft, paddingVertical: 11, paddingHorizontal: 12 }}>
      <IconBox name={icon} />
      <Txt numberOfLines={1} style={[f(500, 12.5, 1.2), { flex: 1 }]}>{label}</Txt>
      <Txt numberOfLines={1} style={[f(400, 11, 1), { color: C.muted2 }]}>{meta}</Txt>
      <ChevronRight />
    </Tap>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Txt style={[f(600, 10.5, 1), { letterSpacing: 0.5, color: C.muted2 }]}>{title}</Txt>
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden', ...cardShadow }}>
        {children}
      </View>
    </View>
  );
}

function Stat({ value, label, onPress }: { value: string | number; label: string; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, padding: 11, gap: 3, ...cardShadow }}>
      <Txt style={f(700, 16, 1)}>{value}</Txt>
      <Txt style={[f(400, 10.5, 1), { color: C.muted }]}>{label}</Txt>
    </Tap>
  );
}

export default function AccountScreen() {
  const pad = usePad();
  const t = useTotals();
  const user = useApp((s) => s.user);
  const order = useApp((s) => s.order);
  const wallet = useApp((s) => s.wallet);
  const sensitive = usePref('sens', true);

  const restart = async () => {
    await logOut();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  return (
    <Screen>
      <Grad
        colors={['#D6EDD9', '#E9F5E4', '#F7FBF2']}
        locations={[0, 0.48, 1]}
        {...cssAngle(124)}
        style={{ borderBottomWidth: 1, borderBottomColor: '#DDE9DA', paddingTop: pad.top(52), paddingHorizontal: 14, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
        <Image source={LOCAL.appIcon} accessibilityLabel="Spice Kart" style={{ width: 40, height: 40, borderRadius: 10 }} />
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={[f(700, 15.5, 1.2), { color: C.forest }]}>Hi, {greetingName(user)}</Txt>
          {!!user.email && <Txt numberOfLines={1} style={[f(400, 11.5, 1), { color: C.greenMuted }]}>{user.email}</Txt>}
        </View>
      </Grad>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 120, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat value={order ? 3 : 2} label="Orders" onPress={() => goTab('orders')} />
          <Stat value="6" label="Offers live" onPress={() => router.push('/offers')} />
          <Stat value={t.n} label="In cart" onPress={() => router.push('/cart')} />
        </View>

        <Grad
          colors={['#0B3D1F', '#14572A', '#1F7135']}
          locations={[0, 0.58, 1]}
          {...cssAngle(122)}
          style={{ borderRadius: 14, padding: 14, gap: 11, boxShadow: '0 8px 20px rgba(11,61,31,0.2)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 30, height: 30, borderWidth: 1, borderColor: 'rgba(139,224,0,0.5)', borderRadius: 8, backgroundColor: 'rgba(139,224,0,0.14)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WalletIcon size={16} color={C.lime} />
            </View>
            <View style={{ gap: 3, flexShrink: 1 }}>
              <Txt numberOfLines={1} style={[f(600, 11, 1), { color: 'rgba(255,255,255,0.66)' }]}>Spice Kart Money</Txt>
              <Txt numberOfLines={1} style={[f(700, 19, 1), { color: '#fff' }]}>
                {'$' + (wallet ?? 0).toFixed(2)}
              </Txt>
            </View>
            <Tap
              onPress={() => router.push('/money')}
              style={{ marginLeft: 'auto', height: 32, paddingHorizontal: 13, borderRadius: 9, backgroundColor: C.lime, justifyContent: 'center' }}>
              <Txt numberOfLines={1} style={[f(700, 11.5, 1), { color: C.forest }]}>Add money</Txt>
            </Tap>
          </View>
          <Txt style={[f(400, 10.5, 1.5), { color: 'rgba(255,255,255,0.6)' }]}>
            Refunds and cashback land here instantly and apply at checkout.
          </Txt>
        </Grad>

        <Group title="YOUR ACCOUNT">
          {[['person', 'Personal details', user.first.trim() ? user.first.trim() + ' ' + (user.last.trim()[0] ?? '') : 'Add your name'] as Row, ...ACCOUNT_ROWS].map((r) => (
            <LinkRow key={r[1]} row={r} />
          ))}
        </Group>

        <Group title="PRIVACY & PREFERENCES">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: C.dividerSoft }}>
            <IconBox name="eye" />
            <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={f(500, 12.5, 1.2)}>Hide sensitive items</Txt>
              <Txt style={[f(400, 10.5, 1.3), { color: C.muted2 }]}>Blur personal-care items in orders</Txt>
            </View>
            <Toggle
              value={sensitive}
              onChange={() => useApp.getState().togglePref('sens', true)}
              label="Toggle hide sensitive items"
            />
          </View>
          {PREF_ROWS.map((r) => (
            <LinkRow key={r[1]} row={r} />
          ))}
        </Group>

        <Group title="HELP & SUPPORT">
          {HELP_ROWS.map((r) => (
            <LinkRow key={r[1]} row={r} />
          ))}
        </Group>

        <Tap
          onPress={restart}
          style={{ height: 42, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={[f(600, 12.5, 1), { color: C.danger }]}>Log out</Txt>
        </Tap>

        <View style={{ alignItems: 'center', gap: 5, paddingTop: 4, paddingBottom: 8 }}>
          <Image source={LOCAL.wordmarkDark} contentFit="contain" style={{ width: 82, aspectRatio: 887 / 181, opacity: 0.45 }} />
          <Txt style={[f(400, 10, 1), { color: C.muted3 }]}>Skip the store. Enjoy more. · v1.0</Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}
