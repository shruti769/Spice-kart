import { router } from 'expo-router';
import { ScrollView } from 'react-native';

import { Row, Section, type GlyphName } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Txt } from '@/components/ui/primitives';
import { f } from '@/constants/theme';

const GROUPS: { title: string; rows: [string, string, GlyphName][] }[] = [
  {
    title: 'AGREEMENTS',
    rows: [
      ['Terms of Service', 'Your agreement with Spice Kart', 'doc'],
      ['Privacy Policy', 'How we handle your personal data', 'doc'],
    ],
  },
  {
    title: 'ORDERS & DELIVERY',
    rows: [
      ['Refund & Cancellation Policy', 'Cancelling, refunds and restocking fees', 'refund'],
      ['Delivery Policy', 'Windows, coverage and failed deliveries', 'truck'],
    ],
  },
  {
    title: 'MONEY',
    rows: [
      ['Payment Policy', 'Charges, holds and receipts', 'card'],
      ['Wallet Terms', 'Spice Kart Money balance and expiry', 'coin'],
      ['Promotional Terms', 'Coupons, offers and eligibility', 'doc'],
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
            {g.rows.map(([title, sub, icon]) => (
              <Row key={title} icon={icon} title={title} sub={sub} chevron onPress={() => router.push('/policy')} />
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
