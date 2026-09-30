import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Card, Chip, Row, type GlyphName } from '@/components/help/kit';
import { BackIcon, SearchIcon } from '@/components/icons';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import type { HelpTopicId } from '@/data/help-topics';
import { goBack } from '@/lib/nav';
import { useHelpTopics } from '@/lib/remote-help';

/** `to`: the help topic and question (index) that answers it. */
type Result = { key: string; title: string; sub?: string; tag: string; icon: GlyphName; to: [HelpTopicId, number] };

const ICON: Record<HelpTopicId, GlyphName> = { orders: 'box', delivery: 'truck', payments: 'card', refunds: 'refund', wallet: 'coin', addresses: 'pin' };

/** Help search results (`sHelpSearch`): every live question whose text matches all the words typed. */
export default function HelpSearchScreen() {
  const pad = usePad();
  const topics = useHelpTopics();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('All');
  const term = q.trim();

  const results = useMemo<Result[]>(() => {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return topics.flatMap((t) =>
      t.questions.flatMap((item, i) => {
        const text = [item.q, item.sub, item.body, item.stepsTitle, ...(item.steps ?? []), item.note].join(' ').toLowerCase();
        return words.every((w) => text.includes(w))
          ? [{ key: item.id ?? `${t.id}-${i}`, title: item.q, sub: item.sub, tag: t.title, icon: ICON[t.id], to: [t.id, i] as [HelpTopicId, number] }]
          : [];
      }),
    );
  }, [topics, term]);

  const filters = ['All', ...new Set(results.map((r) => r.tag))];
  const active = filters.includes(filter) ? filter : 'All';
  const shown = active === 'All' ? results : results.filter((r) => r.tag === active);

  return (
    <Screen>
      <Grad
        preset="header"
        style={{
          paddingTop: pad.top(52),
          paddingHorizontal: 14,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#DFE8CD',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 9,
        }}>
        <Tap
          accessibilityLabel="Back"
          onPress={goBack}
          hitSlop={8}
          style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BackIcon color={C.forest} />
        </Tap>
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            height: 40,
            paddingHorizontal: 11,
            borderWidth: 1,
            borderColor: C.lime,
            borderRadius: 10,
            backgroundColor: '#fff',
            minWidth: 0,
          }}>
          <SearchIcon size={15} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search help articles"
            placeholderTextColor="#8C8C86"
            allowFontScaling={false}
            returnKeyType="search"
            autoCorrect={false}
            autoFocus
            selectionColor={C.green}
            style={[f(600, 13, 1.2), { flex: 1, color: C.ink, padding: 0, height: 38 }]}
          />
          {!!q && (
            <Tap
              accessibilityLabel="Clear"
              onPress={() => setQ('')}
              hitSlop={8}
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: '#F1F2EE',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
              <Txt style={[f(600, 11, 1), { color: '#5F5F5A' }]}>×</Txt>
            </Tap>
          )}
        </View>
      </Grad>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <Txt numberOfLines={1} style={[f(400, 11.5, 1), { color: '#7A7A75' }]}>
          {term
            ? `${results.length} result${results.length === 1 ? '' : 's'} for “${term}”`
            : `Search ${topics.reduce((n, t) => n + t.questions.length, 0)} answers about orders, delivery, payments and more`}
        </Txt>
        {results.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {filters.map((l) => (
              <Chip key={l} label={l} active={active === l} onPress={() => setFilter(l)} />
            ))}
          </View>
        )}
        <Animated.View layout={LinearTransition.duration(200)}>
          {shown.length > 0 && <Card>
            {shown.map((r) => (
              <Animated.View key={r.key} entering={FadeIn.duration(180)} layout={LinearTransition.duration(200)}>
                <Row
                  icon={r.icon}
                  title={r.title}
                  sub={r.sub}
                  chevron
                  onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: r.to[0], q: String(r.to[1]) } })}
                  right={
                    <Txt numberOfLines={1} style={[f(400, 11, 1), { color: '#8C8C86' }]}>
                      {r.tag}
                    </Txt>
                  }
                />
              </Animated.View>
            ))}
          </Card>}
        </Animated.View>
        <Animated.View
          layout={LinearTransition.duration(200)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 11,
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#F7FAF2',
            borderWidth: 1,
            borderColor: '#E4EBD8',
          }}>
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Txt numberOfLines={1} style={[f(600, 12, 1.2), { color: '#3F5B43' }]}>
              Not what you were after?
            </Txt>
            <Txt numberOfLines={1} style={[f(400, 10.5, 1.3), { color: '#5F6B57' }]}>
              Chat with our support team
            </Txt>
          </View>
          <Tap
            onPress={() => router.push('/support')}
            pressedStyle={{ backgroundColor: C.forestHover }}
            style={{
              marginLeft: 'auto',
              height: 32,
              paddingHorizontal: 12,
              borderRadius: 9,
              backgroundColor: C.forest,
              justifyContent: 'center',
            }}>
            <Txt numberOfLines={1} style={[f(600, 11.5, 1), { color: '#fff' }]}>
              Contact
            </Txt>
          </Tap>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}
