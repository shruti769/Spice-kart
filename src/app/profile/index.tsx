import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BackIcon, ChevronRight, WalletIcon } from '@/components/icons';
import { Card, IconBox, SectionLabel, useWalletVals } from '@/components/money/parts';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, cssAngle, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';
import { goBack, goTab } from '@/lib/nav';
import { useApp } from '@/store/app-store';

const I = { stroke: '#3F3F3B', strokeWidth: 1.5 } as const;

const icons = {
  person: (
    <>
      <Circle cx={10} cy={7.4} r={3} {...I} />
      <Path d="M4.6 16.5c.9-3 3-4.3 5.4-4.3s4.5 1.3 5.4 4.3" {...I} strokeLinecap="round" />
    </>
  ),
  pin: (
    <>
      <Path d="M10 17.5s5.4-4.7 5.4-8.6A5.4 5.4 0 004.6 8.9c0 3.9 5.4 8.6 5.4 8.6z" {...I} />
      <Circle cx={10} cy={8.6} r={1.9} {...I} />
    </>
  ),
  card: (
    <>
      <Rect x={2.6} y={5} width={14.8} height={10} rx={2} {...I} />
      <Path d="M2.6 8.6h14.8" {...I} />
    </>
  ),
  wallet: (
    <>
      <Circle cx={10} cy={10} r={7.2} {...I} />
      <Path d="M7.6 7.3h4.2M7.6 9.6h4.2M8.8 12.9l2.6-5.6" stroke="#3F3F3B" strokeWidth={1.4} strokeLinecap="round" />
    </>
  ),
  shield: (
    <Path d="M10 2.8l5.6 2.3v4.6c0 3.3-2.4 5.7-5.6 7.4-3.2-1.7-5.6-4.1-5.6-7.4V5.1L10 2.8z" {...I} strokeLinejoin="round" />
  ),
  bell: (
    <>
      <Path d="M5.6 8.6a4.4 4.4 0 018.8 0v3.4l1.3 2.2H4.3l1.3-2.2V8.6z" {...I} strokeLinejoin="round" />
      <Path d="M8.4 16.2a1.7 1.7 0 003.2 0" {...I} strokeLinecap="round" />
    </>
  ),
  help: (
    <>
      <Circle cx={10} cy={10} r={7.2} {...I} />
      <Path d="M8.1 8a1.9 1.9 0 013.8.3c0 1.3-1.9 1.5-1.9 2.9" {...I} strokeLinecap="round" />
      <Circle cx={10} cy={14} r={0.9} fill="#3F3F3B" />
    </>
  ),
  chat: (
    <Path
      d="M3.4 5.6A1.8 1.8 0 015.2 3.8h9.6a1.8 1.8 0 011.8 1.8v5.6a1.8 1.8 0 01-1.8 1.8H8.4L4.6 16v-2.9h-.4a1.8 1.8 0 01-.8-1.5V5.6z"
      {...I}
      strokeLinejoin="round"
    />
  ),
  doc: (
    <>
      <Path d="M5 3.4h6.6L15.5 7v9.6a1 1 0 01-1 1H6a1 1 0 01-1-1V3.4z" {...I} strokeLinejoin="round" />
      <Path d="M7.6 10.4h4.4M7.6 13h3" {...I} strokeLinecap="round" />
    </>
  ),
};

type RowDef = { icon: keyof typeof icons; title: string; sub?: string; value?: string; href: Href };

/** Settings list row (`padding:11px 12px; gap:11px`, hover #FAFBF7). */
function Row({ icon, title, sub, value, href }: RowDef) {
  return (
    <Tap
      onPress={() => router.push(href)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
        borderBottomWidth: 1,
        borderBottomColor: C.dividerSoft,
        paddingVertical: 11,
        paddingHorizontal: 12,
      }}
      pressedStyle={{ backgroundColor: '#FAFBF7' }}>
      <IconBox>
        <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
          {icons[icon]}
        </Svg>
      </IconBox>
      <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={f(500, 12.5, 1.2)}>
          {title}
        </Txt>
        {!!sub && <Txt style={[f(400, 10.5, 1.3), { color: C.muted2 }]}>{sub}</Txt>}
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

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <SectionLabel>{label}</SectionLabel>
      <Card>{children}</Card>
    </View>
  );
}

function Stat({ n, label, onPress }: { n: string | number; label: string; onPress: () => void }) {
  return (
    <Tap
      onPress={onPress}
      style={[
        {
          flex: 1,
          backgroundColor: '#fff',
          borderWidth: 1,
          borderColor: C.borderCard,
          borderRadius: 12,
          padding: 11,
          gap: 3,
        },
        cardShadow,
      ]}>
      <Txt style={f(700, 16, 1)}>{n}</Txt>
      <Txt numberOfLines={1} style={[f(400, 10.5, 1), { color: C.muted }]}>
        {label}
      </Txt>
    </Tap>
  );
}

/** Profile / account hub (prototype `sProfile`). */
export default function ProfileScreen() {
  const pad = usePad();
  const { walletStr } = useWalletVals();
  const orderCount = useApp((s) => (s.order ? 3 : 2));

  const restart = () => {
    useApp.getState().restart();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  return (
    <Screen>
      {/* Header */}
      <Grad
        preset="header"
        style={{
          paddingTop: pad.top(52),
          paddingHorizontal: 14,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#DFE8CD',
        }}>
        <Tap
          accessibilityLabel="Back"
          onPress={goBack}
          hitSlop={8}
          style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <BackIcon color={C.forest} />
        </Tap>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: C.forest,
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          <Txt style={[f(700, 18, 1), { color: C.lime }]}>JS</Txt>
        </View>
        <View style={{ gap: 4, flexShrink: 1, minWidth: 0 }}>
          <Txt numberOfLines={1} style={[f(700, 17, 1.2), { color: C.forest }]}>
            Jaiveer Singh
          </Txt>
          <Txt numberOfLines={1} style={[f(400, 11.5, 1), { color: C.greenMuted }]}>
            +61 412 908 344 · jaiveer@spicekart.com.au
          </Txt>
        </View>
        <Tap
          onPress={() => router.push('/profile/personal')}
          style={{
            marginLeft: 'auto',
            height: 32,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: '#C8DFA4',
            borderRadius: 9,
            backgroundColor: 'rgba(255,255,255,0.8)',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
          <Txt numberOfLines={1} style={[f(600, 11.5, 1), { color: C.forest }]}>
            Edit
          </Txt>
        </Tap>
      </Grad>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 24, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        {/* Wallet card */}
        <View style={{ borderRadius: 14, boxShadow: '0 8px 20px rgba(11,61,31,0.2)' }}>
          <Grad
            colors={['#0B3D1F', '#14572A', '#1F7135']}
            locations={[0, 0.58, 1]}
            {...cssAngle(122)}
            style={{ borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View
              style={{
                width: 30,
                height: 30,
                borderWidth: 1,
                borderColor: 'rgba(139,224,0,0.5)',
                borderRadius: 8,
                backgroundColor: 'rgba(139,224,0,0.14)',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
              <WalletIcon size={16} color={C.lime} />
            </View>
            <View style={{ gap: 3 }}>
              <Txt numberOfLines={1} style={[f(600, 10.5, 1), { color: 'rgba(255,255,255,0.64)' }]}>
                SPICE KART MONEY
              </Txt>
              <Txt numberOfLines={1} style={[f(700, 19, 1), { color: '#fff' }]}>
                {walletStr}.00
              </Txt>
            </View>
            <Tap
              onPress={() => router.push('/money')}
              style={{
                marginLeft: 'auto',
                height: 32,
                paddingHorizontal: 13,
                borderRadius: 9,
                backgroundColor: C.lime,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              pressedStyle={{ backgroundColor: C.limeHover }}>
              <Txt numberOfLines={1} style={[f(700, 11.5, 1), { color: C.forest }]}>
                Add money
              </Txt>
            </Tap>
          </Grad>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat n={orderCount} label="Orders" onPress={() => goTab('orders')} />
          <Stat n={6} label="Coupons" onPress={() => router.push('/offers')} />
          <Stat n={3} label="Addresses" onPress={() => router.push('/addresses')} />
        </View>

        <Section label="ACCOUNT">
          <Row icon="person" title="Personal details" value="Jaiveer S" href="/profile/personal" />
          <Row icon="pin" title="Saved addresses" value="3 saved" href="/addresses" />
          <Row icon="card" title="Payment methods" value="Visa · 4417" href="/payments" />
          <Row icon="wallet" title="Spice Kart Money" value={`${walletStr}.00`} href="/money" />
        </Section>

        <Section label="PRIVACY">
          <Row icon="shield" title="Privacy & data" sub="Permissions, marketing and account data" href="/profile/privacy" />
          <Row icon="bell" title="Notifications" value="On" href="/profile/privacy" />
        </Section>

        <Section label="SUPPORT">
          <Row icon="help" title="Help centre" sub="FAQs, orders, refunds and delivery" href="/help" />
          <Row icon="chat" title="Contact support" value="24/7" href="/support" />
          <Row icon="doc" title="Terms & policies" href="/terms" />
        </Section>

        <Tap
          onPress={restart}
          accessibilityRole="button"
          style={{
            height: 44,
            borderWidth: 1,
            borderColor: C.border,
            backgroundColor: '#fff',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          pressedStyle={{ backgroundColor: '#FDF6F4' }}>
          <Txt style={[f(600, 12.5, 1), { color: C.danger }]}>Log out</Txt>
        </Tap>

        <View style={{ alignItems: 'center', gap: 5, paddingTop: 2, paddingBottom: 6 }}>
          <Image source={LOCAL.wordmarkDark} contentFit="contain" style={{ width: 78, aspectRatio: 887 / 181, opacity: 0.4 }} />
          <Txt numberOfLines={1} style={[f(400, 10, 1), { color: C.muted3 }]}>
            Skip the store. Enjoy more. · v1.0
          </Txt>
        </View>
      </ScrollView>
    </Screen>
  );
}
