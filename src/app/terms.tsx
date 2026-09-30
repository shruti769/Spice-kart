import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { Row, Section, type GlyphName } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Txt } from '@/components/ui/primitives';
import { f } from '@/constants/theme';
import type { PolicyId } from '@/lib/policies';

const GROUPS: { title: string; rows: [string, string, GlyphName, PolicyId][] }[] = [
  {
    title: 'AGREEMENTS',
    rows: [
      ['Terms of Service', 'Your agreement with Spice Kart', 'doc', 'terms'],
      ['Privacy Policy', 'How we handle your personal data', 'doc', 'privacy'],
    ],
  },
  {
    title: 'ORDERS & DELIVERY',
    rows: [
      ['Refund & Cancellation Policy', 'Cancelling, refunds and restocking fees', 'refund', 'refund'],
      ['Delivery Policy', 'Windows, coverage and failed deliveries', 'truck', 'delivery'],
    ],
  },
  {
    title: 'MONEY',
    rows: [
      ['Payment Policy', 'Charges, holds and receipts', 'card', 'payment'],
      ['Wallet Terms', 'Top-ups, cashback and withdrawals', 'coin', 'wallet'],
      ['Promotional Terms', 'Coupons, offers and eligibility', 'doc', 'promo'],
    ],
  },
];

/** Terms & policies index (`sTerms`). */
export default function TermsScreen() {
  return (
    <Screen>
      <ScreenHeader variant="tint" title="Terms & policies" subtitle="Effective 1 July 2026" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        {GROUPS.map((g) => (
          <Section key={g.title} title={g.title}>
            {g.rows.map(([title, sub, icon, id]) => (
              <Row key={title} icon={icon} title={title} sub={sub} chevron onPress={() => router.push({ pathname: '/policy', params: { id } })} />
            ))}
          </Section>
        ))}
        <Txt style={[f(400, 10, 1.6), { color: '#9A9A95' }]}>
          Spice Kart Pty Ltd · ABN 41 998 220 117 · 118 Smith Street, Collingwood VIC 3066. Email legal@spicekart.com.au
          for a printed copy.
        </Txt>
      </ScrollView>
    </Screen>
  );
}
