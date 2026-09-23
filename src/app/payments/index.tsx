import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import {
  DefaultBadge,
  Footer,
  LinkRow,
  SecureNote,
  Section,
  TileButton,
  TrashButton,
  scrollContent,
} from '@/components/account-forms/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Grad, Screen, Txt } from '@/components/ui/primitives';
import { C, cardShadow, cssAngle, f } from '@/constants/theme';
import { WALLET_BALANCE } from '@/data/catalog';
import { useApp } from '@/store/app-store';

const CARDS = [
  { brand: 'VISA', exp: 'Exp 09/28', last4: '4417', tint: '#F3F7EC', isDefault: true },
  { brand: 'MASTERCARD', exp: 'Exp 03/27', last4: '8802', tint: '#F2F4F8', isDefault: false },
] as const;

const angle = cssAngle(120);

/** Saved cards and wallets (prototype `sPayments`). */
export default function PaymentsScreen() {
  const flash = useApp((s) => s.flash);
  const wallet = useApp((s) => s.wallet);
  const soon = () => flash('Coming soon');
  const walletStr = '$' + (wallet ?? WALLET_BALANCE).toFixed(0) + '.00';

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Payment methods" subtitle="2 cards saved" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={scrollContent} showsVerticalScrollIndicator={false}>
        {CARDS.map((c) => (
          <Grad
            key={c.last4}
            colors={[c.tint, '#FFFFFF']}
            {...angle}
            style={[{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E4E4DF' }, cardShadow]}>
            <View style={{ padding: 14, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Txt numberOfLines={1} style={[f(700, 12, 1), { letterSpacing: 1 }]}>
                  {c.brand}
                </Txt>
                {c.isDefault && <DefaultBadge />}
                <Txt numberOfLines={1} style={[f(400, 10.5, 1), { marginLeft: 'auto', color: C.muted2 }]}>
                  {c.exp}
                </Txt>
              </View>
              <Txt numberOfLines={1} style={[f(600, 16, 1), { letterSpacing: 2.5 }]}>
                {'•••• •••• •••• ' + c.last4}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
              <TileButton label="Edit" onPress={soon} height={32} radius={8} size={11} />
              {!c.isDefault && <TileButton label="Set default" onPress={soon} height={32} radius={8} size={11} />}
              <TrashButton label="Remove card" onPress={soon} width={36} height={32} radius={8} />
            </View>
          </Grad>
        ))}

        <Section label="WALLETS">
          <LinkRow
            icon={
              <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
                <Circle cx={10} cy={10} r={7.2} stroke={C.ink2} strokeWidth={1.5} />
                <Path d="M7.6 7.3h4.2M7.6 9.6h4.2M8.8 12.9l2.6-5.6" stroke={C.ink2} strokeWidth={1.4} strokeLinecap="round" />
              </Svg>
            }
            title="Spice Kart Money"
            sub="Applies before card at checkout"
            value={walletStr}
            onPress={() => router.push('/money')}
          />
        </Section>
        <SecureNote />
      </ScrollView>
      <Footer label="+ Add payment method" onPress={() => router.push('/payments/add-card')} />
    </Screen>
  );
}
