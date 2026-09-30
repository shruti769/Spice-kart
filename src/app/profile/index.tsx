import { router, type Href } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { DialogButtons } from '@/components/account-forms/parts';
import { BottomNav } from '@/components/bottom-nav';
import { ChevronRight } from '@/components/icons';
import { useWalletVals } from '@/components/money/parts';
import { CenterDialog } from '@/components/overlays';
import { Toggle } from '@/components/ui/toggle';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, cssAngle, f } from '@/constants/theme';
import { goTab } from '@/lib/nav';
import { logOut, setServerPref } from '@/lib/remote-privacy';
import { brandName, greetingName, useApp, useDefaultCard, usePref, useTotals } from '@/store/app-store';

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
  eyeOff: (
    <>
      <Path d="M3 10s2.6-4.8 7-4.8S17 10 17 10s-2.6 4.8-7 4.8S3 10 3 10z" {...I} strokeLinejoin="round" />
      <Circle cx={10} cy={10} r={2.1} {...I} />
      <Path d="M4 4l12 12" {...I} strokeLinecap="round" />
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

type RowDef = { icon: keyof typeof icons; title: string; sub?: string; value?: string; href?: Href; right?: ReactNode; last?: boolean };

function RowIcon({ icon }: { icon: keyof typeof icons }) {
  return (
    <View style={styles.rowIcon}>
      <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
        {icons[icon]}
      </Svg>
    </View>
  );
}

/** Settings list row: icon box, title (+ optional sub), grey value and chevron — or a custom `right` control. */
function Row({ icon, title, sub, value, href, right, last }: RowDef) {
  const content = (
    <>
      <RowIcon icon={icon} />
      <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
        <Txt numberOfLines={1} style={f(500, 12.5, 1.2)}>{title}</Txt>
        {!!sub && <Txt numberOfLines={1} style={[f(400, 10.5, 1.3), { color: C.muted2 }]}>{sub}</Txt>}
      </View>
      {right ?? (
        <>
          {!!value && <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted2 }]}>{value}</Txt>}
          <ChevronRight />
        </>
      )}
    </>
  );
  const style = [styles.row, !last && styles.rowDivider];
  return href ? (
    <Tap onPress={() => router.push(href)} style={style} pressedStyle={{ backgroundColor: '#FAFBF7' }}>
      {content}
    </Tap>
  ) : (
    <View style={style}>{content}</View>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View>
      <Txt numberOfLines={1} style={styles.sectionLabel}>{label}</Txt>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Stat({ n, label, onPress }: { n: string | number; label: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={styles.stat} pressedStyle={{ borderColor: C.lime }}>
      <Txt style={f(700, 16, 1.2)}>{n}</Txt>
      <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted }]}>{label}</Txt>
    </Tap>
  );
}

/** Profile / account hub (prototype `sProfile`). */
export default function ProfileScreen() {
  const pad = usePad();
  const { walletStr } = useWalletVals();
  const orderCount = useApp((s) => (s.order ? 3 : 2));
  const { n: inCart } = useTotals();
  const sens = usePref('sens', true);
  const push = usePref('push', true);
  const user = useApp((s) => s.user);
  const savedCount = useApp((s) => s.addresses.length);
  const card = useDefaultCard();

  const [logoutOpen, setLogoutOpen] = useState(false);

  const restart = async () => {
    setLogoutOpen(false);
    await logOut();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };

  return (
    <Screen>
      <Grad preset="header" style={[styles.header, { paddingTop: pad.top(53) }]}>
        <Txt numberOfLines={1} style={[f(700, 17, 1.2), { color: C.forest }]}>Hi {greetingName(user)}</Txt>
      </Grad>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: pad.bottom(30) + 90 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.stats}>
          <Stat n={orderCount} label="Orders" onPress={() => goTab('orders')} />
          <Stat n={6} label="Offers live" onPress={() => router.push('/offers')} />
          <Stat n={inCart} label="In cart" onPress={() => router.push('/cart')} />
        </View>

        <View style={styles.walletShadow}>
          <Grad colors={['#0B3D1F', '#14572A', '#1F7135']} locations={[0, 0.58, 1]} {...cssAngle(122)} style={styles.wallet}>
            <View style={styles.walletRow}>
              <View style={styles.walletIcon}>
                <Svg width={17} height={17} viewBox="0 0 20 20" fill="none">
                  <Circle cx={10} cy={10} r={7.2} stroke={C.lime} strokeWidth={1.5} />
                  <Path d="M7.6 7.3h4.2M7.6 9.6h4.2M8.8 12.9l2.6-5.6" stroke={C.lime} strokeWidth={1.4} strokeLinecap="round" />
                </Svg>
              </View>
              <View style={{ gap: 1, flexShrink: 1 }}>
                <Txt numberOfLines={1} style={[f(500, 11.5, 1.2), { color: 'rgba(255,255,255,0.7)' }]}>Spice Kart Money</Txt>
                <Txt numberOfLines={1} style={[f(700, 19, 1.2), { color: '#fff' }]}>{walletStr}</Txt>
              </View>
              <Tap onPress={() => router.push('/money/amount')} style={styles.addMoney} pressedStyle={{ backgroundColor: C.limeHover }}>
                <Txt numberOfLines={1} style={[f(700, 11.5, 1.2), { color: C.forest }]}>Add money</Txt>
              </Tap>
            </View>
            <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[f(400, 10.5, 1.3), { color: 'rgba(255,255,255,0.65)' }]}>
              Refunds and cashback land here instantly and apply at checkout.
            </Txt>
          </Grad>
        </View>

        <Section label="YOUR ACCOUNT">
          <Row icon="person" title="Personal details" value={user.first.trim() ? user.first.trim() + ' ' + (user.last.trim()[0] ?? '') : 'Add your name'} href="/profile/personal" />
          <Row icon="pin" title="Saved addresses" value={savedCount + " saved"} href="/addresses" />
          <Row icon="card" title="Payment methods" value={brandName(card) + ' · ' + card.last4} href="/payments" last />
        </Section>

        <Section label="PRIVACY & PREFERENCES">
          <Row
            icon="eyeOff"
            title="Hide sensitive items"
            sub="Blur personal-care items in orders"
            right={<Toggle value={sens} onChange={() => useApp.getState().togglePref('sens', true)} label="Hide sensitive items" />}
          />
          <Row icon="bell" title="Notifications" right={<Toggle value={push} onChange={() => setServerPref('push', !push)} label="Notifications" />} />
          <Row icon="shield" title="Privacy & data" href="/profile/privacy" last />
        </Section>

        <Section label="HELP & SUPPORT">
          <Row icon="help" title="Help centre" value="FAQs & guides" href="/help" />
          <Row icon="chat" title="Contact support" value="24/7" href="/support" />
          <Row icon="doc" title="Terms & policies" href="/terms" last />
        </Section>

        <Tap onPress={() => setLogoutOpen(true)} accessibilityRole="button" style={styles.logout} pressedStyle={{ backgroundColor: '#FDF6F4' }}>
          <Txt style={[f(600, 12.5, 1.2), { color: C.danger }]}>Log out</Txt>
        </Tap>

        <Txt numberOfLines={1} style={[f(400, 10, 1.25), styles.version]}>Skip the store. Enjoy more. · v1.0</Txt>
      </ScrollView>

      <BottomNav active={null} showCartBar={false} />

      <CenterDialog plain visible={logoutOpen} onClose={() => setLogoutOpen(false)} style={styles.dialog}>
        <Txt style={f(700, 15, 1.3)}>Log out?</Txt>
        <Txt style={[f(400, 12.5, 1.4), { color: C.muted }]}>Do you really want to log out?</Txt>
        <DialogButtons cancel="Cancel" confirm="Log out" onCancel={() => setLogoutOpen(false)} onConfirm={restart} height={40} size={12.5} />
      </CenterDialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexShrink: 0, paddingLeft: 15, paddingRight: 16, paddingBottom: 19, borderBottomWidth: 1, borderBottomColor: '#DFE8CD' },
  content: { paddingTop: 22, paddingHorizontal: 16 },

  stats: { flexDirection: 'row', gap: 9 },
  stat: { flex: 1, minHeight: 54, justifyContent: 'center', gap: 1, paddingHorizontal: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, ...cardShadow },

  walletShadow: { marginTop: 13, borderRadius: 14, boxShadow: '0 8px 20px rgba(11,61,31,0.2)' },
  wallet: { minHeight: 90, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 15, gap: 12, overflow: 'hidden' },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  walletIcon: { width: 31, height: 31, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(139,224,0,0.5)', backgroundColor: 'rgba(139,224,0,0.14)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addMoney: { marginLeft: 'auto', height: 32, paddingHorizontal: 14, borderRadius: 10, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },

  sectionLabel: { ...f(600, 10.5, 1.25), letterSpacing: 0.6, color: C.muted2, marginTop: 18, marginBottom: 11 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, overflow: 'hidden', ...cardShadow },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, paddingHorizontal: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: C.dividerSoft },
  rowIcon: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: '#D9D9D4', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  logout: { marginTop: 18, height: 44, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dialog: { width: '100%', maxWidth: 300, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, gap: 8, boxShadow: '0 12px 30px rgba(0,0,0,0.18)' },
  version: { color: C.muted3, textAlign: 'center', marginTop: 20, marginBottom: 6 },
});
