import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Card, FooterBar, OutlineButton } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

const STEPS = [
  'Open Orders and select the order.',
  'Tap Report an issue and choose the affected items.',
  'Add a photo if the item arrived damaged.',
  'Submit — most refunds are approved within minutes.',
];

const para = [f(400, 13, 1.7), { color: '#4A4A45' }];

/** Help article (`sHelpArticle`). */
export default function HelpArticleScreen() {
  const flash = useApp((s) => s.flash);
  return (
    <Screen>
      <ScreenHeader variant="tint" title="Refunds" subtitle="Last updated 24 Aug 2026" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <Txt accessibilityRole="header" style={[f(700, 19, 1.35), { color: C.ink }]}>
          How refunds are processed
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          <Txt
            style={[
              f(600, 10, 1),
              { color: C.green, backgroundColor: '#F1F9DF', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 5, overflow: 'hidden' },
            ]}>
            Refunds
          </Txt>
          <Txt
            style={[
              f(500, 10, 1),
              { color: '#7A7A75', backgroundColor: '#F1F2EE', paddingVertical: 6, paddingHorizontal: 8, borderRadius: 5, overflow: 'hidden' },
            ]}>
            2 min read
          </Txt>
        </View>
        <Txt style={para}>
          If an item is missing, damaged or unavailable, we refund it automatically once your shopper marks the order
          complete. Refunds go to Spice Kart Money by default so you can spend them on your next order straight away.
        </Txt>

        <Card style={{ padding: 13, gap: 11 }}>
          <Txt numberOfLines={1} style={[f(600, 11.5, 1), { color: '#8C8C86', letterSpacing: 0.4 }]}>
            HOW TO REQUEST A REFUND
          </Txt>
          {STEPS.map((s, i) => (
            <View key={s} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: C.lime,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                <Txt style={[f(700, 10.5, 1.2), { color: C.forest }]}>{i + 1}</Txt>
              </View>
              <Txt style={[f(400, 12.5, 1.55), { color: '#3F3F3B', flex: 1 }]}>{s}</Txt>
            </View>
          ))}
        </Card>

        <Txt style={para}>
          Prefer the money back on your card? Choose “Refund to card” when you report the issue — bank refunds take 3–5
          business days.
        </Txt>

        <Card style={{ padding: 13, gap: 10 }}>
          <Txt numberOfLines={1} style={f(600, 12.5, 1)}>
            Was this helpful?
          </Txt>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Tap
              onPress={() => flash('Thanks for the feedback')}
              style={{
                flex: 1,
                height: 38,
                borderWidth: 1,
                borderColor: '#C7E88A',
                backgroundColor: '#F7FCEE',
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Txt style={[f(600, 12, 1), { color: C.forest }]}>Yes, thanks</Txt>
            </Tap>
            <Tap
              onPress={() => flash('We will improve this article')}
              style={{
                flex: 1,
                height: 38,
                borderWidth: 1,
                borderColor: '#E3E3DE',
                backgroundColor: '#fff',
                borderRadius: 9,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Txt style={f(600, 12, 1)}>Not really</Txt>
            </Tap>
          </View>
        </Card>
      </ScrollView>
      <FooterBar>
        <OutlineButton label="Contact support" onPress={() => router.push('/support')} />
      </FooterBar>
    </Screen>
  );
}
