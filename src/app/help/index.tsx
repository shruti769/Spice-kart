import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Card, Caption, Glyph, SearchButton, type GlyphName } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Grad, Grid, Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, cardShadow, cssAngle, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';

const TOPICS: [string, GlyphName][] = [
  ['Orders', 'box'],
  ['Delivery', 'truck'],
  ['Payments', 'card'],
  ['Refunds', 'refund'],
  ['Wallet', 'coin'],
  ['Addresses', 'pin'],
];

const FAQS: { q: string; a?: string }[] = [
  {
    q: 'Where is my order?',
    a: 'Open Orders and tap Track to follow your shopper on the map, with a live arrival time. Tracking begins once picking starts.',
  },
  { q: 'An item is missing from my delivery' },
  { q: 'How do refunds to Spice Kart Money work?' },
  { q: 'Can I change my address after ordering?' },
  { q: 'Why was my payment declined?' },
];

const openArticle = () => router.push('/help/article');

/** Help centre (`sHelp`). */
export default function HelpScreen() {
  return (
    <Screen>
      <ScreenHeader variant="tint" title="Help centre" subtitle="Answers, guides and live support" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <SearchButton placeholder="How can we help?" onPress={() => router.push('/help/search')} />

        <View style={{ gap: 8 }}>
          <Caption>POPULAR TOPICS</Caption>
          <Grid
            data={TOPICS}
            columns={3}
            gap={8}
            keyOf={(t) => t[0]}
            renderItem={([label, icon]) => (
              <Tap
                onPress={openArticle}
                pressedStyle={{ borderColor: C.lime }}
                style={[
                  {
                    alignItems: 'flex-start',
                    gap: 8,
                    borderWidth: 1,
                    borderColor: '#EAEAE6',
                    backgroundColor: '#fff',
                    borderRadius: 12,
                    padding: 11,
                  },
                  cardShadow,
                ]}>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderWidth: 1,
                    borderColor: '#D9D9D4',
                    borderRadius: 8,
                    backgroundColor: '#fff',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Glyph name={icon} />
                </View>
                <Txt numberOfLines={1} style={f(600, 11.5, 1.25)}>
                  {label}
                </Txt>
              </Tap>
            )}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Caption>FREQUENT QUESTIONS</Caption>
          <Card>
            {FAQS.map(({ q, a }) => (
              <View
                key={q}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0F0EC',
                  paddingVertical: 11,
                  paddingHorizontal: 12,
                  gap: a ? 7 : 0,
                }}>
                <Tap onPress={openArticle} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Txt style={[f(a ? 600 : 500, 12.5, 1.35), { flex: 1, color: C.ink }]}>{q}</Txt>
                  <Txt style={[f(600, 14, 1), { color: '#8C8C86', flexShrink: 0 }]}>{a ? '−' : '+'}</Txt>
                </Tap>
                {!!a && <Txt style={[f(400, 11.5, 1.6), { color: '#7A7A75' }]}>{a}</Txt>}
              </View>
            ))}
          </Card>
        </View>

        <Grad
          colors={['#0B3D1F', '#14572A', '#1F7135']}
          locations={[0, 0.58, 1]}
          {...cssAngle(122)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            padding: 12,
            borderRadius: 12,
            boxShadow: '0 8px 20px rgba(11,61,31,0.2)',
          }}>
          <Image source={LOCAL.appIcon} style={{ width: 36, height: 36, borderRadius: 10 }} />
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Txt numberOfLines={1} style={[f(600, 12.5, 1.2), { color: '#fff' }]}>
              Still need a hand?
            </Txt>
            <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: 'rgba(255,255,255,0.66)' }]}>
              Our Melbourne team is online 24/7
            </Txt>
          </View>
          <Tap
            onPress={() => router.push('/support')}
            pressedStyle={{ backgroundColor: C.limeHover }}
            style={{
              marginLeft: 'auto',
              height: 32,
              paddingHorizontal: 13,
              borderRadius: 9,
              backgroundColor: C.lime,
              justifyContent: 'center',
            }}>
            <Txt numberOfLines={1} style={[f(700, 11.5, 1), { color: C.forest }]}>
              Contact
            </Txt>
          </Tap>
        </Grad>
      </ScrollView>
    </Screen>
  );
}
