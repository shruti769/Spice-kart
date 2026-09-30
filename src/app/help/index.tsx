import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Card, Caption, Glyph, SearchButton, type GlyphName } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Grad, Grid, Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';
import { TOPIC_OF_TAG, type HelpTopicId } from '@/data/help-topics';
import { trackHelpView, useHelpStore, useHelpTopics } from '@/lib/remote-help';

const TOPICS: [string, GlyphName][] = [
  ['Orders', 'box'],
  ['Delivery', 'truck'],
  ['Payments', 'card'],
  ['Refunds', 'refund'],
  ['Wallet', 'coin'],
  ['Addresses', 'pin'],
];

type Faq = { q: string; a?: string; id?: string; topic: HelpTopicId; index: number };

const layout = LinearTransition.duration(200);

/** Built-in list until the live articles load; answers come from the matching topic question. */
const FAQS: Faq[] = [
  {
    q: 'Where is my order?',
    a: 'Tap Orders in the bottom bar, then Track on your order to see each step and your estimated arrival.',
    topic: 'orders',
    index: 0,
  },
  { q: 'An item is missing from my delivery', topic: 'orders', index: 1 },
  { q: 'How long do refunds take?', topic: 'refunds', index: 1 },
  { q: 'Can I change my address after ordering?', topic: 'addresses', index: 0 },
  { q: 'Why was my payment declined?', topic: 'payments', index: 0 },
];

const openTopic = (topic: HelpTopicId, q = 0) => router.push({ pathname: '/help/[topic]', params: { topic, q: String(q) } });

/** The five most-read live questions, each with its answer for the inline accordion. */
function useFaqs(): Faq[] {
  const topics = useHelpTopics();
  const articles = useHelpStore((s) => s.articles);
  const loaded = useHelpStore((s) => s.loaded);
  return useMemo(() => {
    if (!loaded || !articles.length) {
      return FAQS.map((x) => ({ ...x, a: x.a ?? topics.find((t) => t.id === x.topic)?.questions[x.index]?.body }));
    }
    const top = [...articles].sort((a, b) => b.views - a.views).slice(0, 5);
    return top.flatMap((a) => {
      const topic = topics.find((t) => t.id === a.topic);
      const index = topic?.questions.findIndex((x) => x.id === a.id) ?? -1;
      if (!topic || index < 0) return [];
      const item = topic.questions[index];
      return [{ q: item.q, a: item.body, id: item.id, topic: topic.id, index }];
    });
  }, [topics, articles, loaded]);
}

/** Help centre (`sHelp`). */
export default function HelpScreen() {
  const faqs = useFaqs();
  // All questions start closed; tapping a question toggles it in place.
  const [open, setOpen] = useState<number | null>(null);
  // Count each live question once per visit when it's opened.
  const openId = open == null ? undefined : faqs[open]?.id;
  const [seen] = useState(() => new Set<string>());
  useEffect(() => {
    if (!openId || seen.has(openId)) return;
    seen.add(openId);
    trackHelpView(openId);
  }, [openId, seen]);
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
                onPress={() => openTopic(TOPIC_OF_TAG[label])}
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
            <Animated.View layout={layout}>
              {faqs.map(({ q, a, topic, index }, i) => {
                const isOpen = open === i;
                return (
                  <Animated.View
                    key={q}
                    layout={layout}
                    style={{
                      borderBottomWidth: i < faqs.length - 1 ? 1 : 0,
                      borderBottomColor: '#F0F0EC',
                      paddingVertical: 11,
                      paddingHorizontal: 12,
                      gap: isOpen ? 7 : 0,
                    }}>
                    <Tap
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      onPress={() => (a ? setOpen(isOpen ? null : i) : openTopic(topic, index))}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Txt style={[f(isOpen ? 600 : 500, 12.5, 1.35), { flex: 1, color: C.ink }]}>{q}</Txt>
                      <Txt style={[f(600, 14, 1), { color: '#8C8C86', flexShrink: 0 }]}>{isOpen ? '−' : '+'}</Txt>
                    </Tap>
                    {isOpen && !!a && (
                      <Animated.View entering={FadeIn.duration(180)}>
                        <Txt style={[f(400, 11.5, 1.6), { color: '#7A7A75' }]}>{a}</Txt>
                      </Animated.View>
                    )}
                  </Animated.View>
                );
              })}
            </Animated.View>
          </Card>
        </View>

        <Grad
          colors={['#0B3D1F', '#14572A', '#1F7135']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
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
