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
import { brandName, useApp, type SavedCard } from '@/store/app-store';

const TINTS: Record<SavedCard['brand'], string> = { VISA: '#F3F7EC', MASTERCARD: '#F2F4F8', AMEX: '#EEF4F7' };

const angle = cssAngle(120);

/** Saved cards and wallets (prototype `sPayments`). */
export default function PaymentsScreen() {
  const flash = useApp((s) => s.flash);
  const wallet = useApp((s) => s.wallet);
  const cards = useApp((s) => s.cards);
  const defaultCard = useApp((s) => s.defaultCard);
  const setDefault = (i: number) => {
    useApp.getState().set({ defaultCard: i });
    flash(brandName(cards[i]) + ' ending ' + cards[i].last4 + ' is now your default');
  };
  const remove = (i: number) => {
    if (cards.length <= 1) return flash('Keep at least one card on file');
    useApp.getState().removeCard(i);
    flash('Card removed');
  };
  const walletStr = '$' + (wallet ?? 0).toFixed(2);

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Payment methods" subtitle={cards.length + (cards.length === 1 ? ' card saved' : ' cards saved')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={scrollContent} showsVerticalScrollIndicator={false}>
        {cards.map((c, i) => (
          <Grad
            key={c.brand + c.last4 + i}
            colors={[TINTS[c.brand], '#FFFFFF']}
            {...angle}
            style={[{ borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E4E4DF' }, cardShadow]}>
            <View style={{ padding: 14, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Txt numberOfLines={1} style={[f(700, 12, 1), { letterSpacing: 1 }]}>
                  {c.brand}
                </Txt>
                {i === defaultCard && <DefaultBadge />}
                <Txt numberOfLines={1} style={[f(400, 10.5, 1), { marginLeft: 'auto', color: C.muted2 }]}>
                  {'Exp ' + c.exp}
                </Txt>
              </View>
              <Txt numberOfLines={1} style={[f(600, 16, 1), { letterSpacing: 2.5 }]}>
                {'•••• •••• •••• ' + c.last4}
              </Txt>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingBottom: 12 }}>
              <TileButton label="Edit" onPress={() => router.push('/payments/add-card')} height={32} radius={8} size={11} />
              {i !== defaultCard && <TileButton label="Set default" onPress={() => setDefault(i)} height={32} radius={8} size={11} />}
              <TrashButton label="Remove card" onPress={() => remove(i)} width={36} height={32} radius={8} />
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
