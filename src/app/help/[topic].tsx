import { Image } from 'expo-image';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { Caption } from '@/components/help/kit';
import { BackIcon } from '@/components/icons';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';
import type { HelpQuestion } from '@/data/help-topics';
import { goBack } from '@/lib/nav';
import { sendHelpFeedback, trackHelpView, useHelpTopics } from '@/lib/remote-help';
import { useApp } from '@/store/app-store';

const layout = LinearTransition.duration(200);

/** Round +/− badge on the right of each question. */
function Toggle({ open }: { open: boolean }) {
  return (
    <View style={[styles.toggle, open ? styles.toggleOpen : styles.toggleShut]}>
      <Txt style={[f(700, open ? 17 : 15, 1), { color: open ? C.forest : '#6E6E68', marginTop: -1 }]}>{open ? '−' : '+'}</Txt>
    </View>
  );
}

function Answer({ item }: { item: HelpQuestion }) {
  const flash = useApp((s) => s.flash);
  const [vote, setVote] = useState<'yes' | 'no' | null>(null);
  const answer = (v: 'yes' | 'no') => {
    if (vote === v) return;
    // Only the first answer is counted.
    if (item.id && !vote) sendHelpFeedback(item.id, v === 'yes');
    setVote(v);
    flash(v === 'yes' ? 'Thanks for the feedback' : 'Thanks · we’ll improve this answer');
  };
  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.answer}>
      <Txt style={styles.body}>{item.body}</Txt>
      {!!item.steps?.length && (
        <View style={styles.steps}>
          {!!item.stepsTitle && <Caption>{item.stepsTitle}</Caption>}
          {item.steps.map((s, i) => (
            <View key={s} style={styles.step}>
              <View style={styles.stepNo}>
                <Txt style={[f(700, 11, 1.2), { color: C.forest }]}>{i + 1}</Txt>
              </View>
              <Txt style={styles.stepText}>{s}</Txt>
            </View>
          ))}
        </View>
      )}
      {!!item.note && <Txt style={styles.note}>{item.note}</Txt>}
      <View style={styles.helpful}>
        <Txt style={[f(400, 12.5, 1.2), { color: '#7A7A75', flex: 1 }]}>Was this helpful?</Txt>
        <Tap onPress={() => answer('yes')} accessibilityState={{ selected: vote === 'yes' }} style={[styles.vote, styles.voteYes]}>
          <Txt style={[f(600, 12.5, 1), { color: C.forest }]}>Yes</Txt>
        </Tap>
        <Tap onPress={() => answer('no')} accessibilityState={{ selected: vote === 'no' }} style={[styles.vote, vote === 'no' && styles.voteNoOn]}>
          <Txt style={f(600, 12.5, 1)}>No</Txt>
        </Tap>
      </View>
    </Animated.View>
  );
}

/** A help topic (Orders, Delivery, Payments, Refunds, Wallet, Addresses): common questions as an accordion. */
export default function HelpTopicScreen() {
  const pad = usePad();
  const { topic: id, q } = useLocalSearchParams<{ topic: string; q?: string }>();
  const topic = useHelpTopics().find((t) => t.id === id);
  // The first question starts open (or the one linked to).
  const [open, setOpen] = useState<number | null>(() => Number(q ?? 0) || 0);
  // Count each question once per visit when it's opened.
  const openId = open == null ? undefined : topic?.questions[open]?.id;
  const [seen] = useState(() => new Set<string>());
  useEffect(() => {
    if (!openId || seen.has(openId)) return;
    seen.add(openId);
    trackHelpView(openId);
  }, [openId, seen]);

  if (!topic) return <Redirect href="/help" />;

  return (
    <Screen>
      <Grad preset="header" style={[styles.header, { paddingTop: pad.top(52) }]}>
        <Tap accessibilityLabel="Back" onPress={goBack} hitSlop={8} style={styles.back}>
          <BackIcon color={C.forest} />
        </Tap>
        <Txt accessibilityRole="header" numberOfLines={1} style={[f(700, 17.5, 1.2), { color: C.forest }]}>
          {topic.title}
        </Txt>
      </Grad>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: pad.bottom(30) + 84 }]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.intro, cardShadow]}>
          <View style={styles.letter}>
            <Txt style={[f(700, 15, 1), { color: C.forest }]}>{topic.title[0]}</Txt>
          </View>
          <Txt style={[f(400, 12.5, 1.5), { color: '#5E5E58', flex: 1 }]}>{topic.intro}</Txt>
        </View>

        <View style={{ gap: 8 }}>
          <View style={{ paddingLeft: 2 }}>
            <Caption>COMMON QUESTIONS</Caption>
          </View>
          <Animated.View layout={layout} style={[styles.list, cardShadow]}>
            {topic.questions.map((item, i) => {
              const isOpen = open === i;
              return (
                <Animated.View key={item.id ?? item.q} layout={layout} style={[i > 0 && styles.divider, isOpen && styles.openBg]}>
                  <Tap
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    onPress={() => setOpen(isOpen ? null : i)}
                    style={styles.question}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Txt style={[f(isOpen ? 600 : 500, 13.5, 1.3), { color: C.ink }]}>{item.q}</Txt>
                      <Txt style={[f(400, 11, 1.3), { color: '#8C8C86' }]}>{item.sub}</Txt>
                    </View>
                    <Toggle open={isOpen} />
                  </Tap>
                  {isOpen && <Answer key={item.id ?? item.q} item={item} />}
                </Animated.View>
              );
            })}
          </Animated.View>
        </View>
      </ScrollView>

      <Grad
        colors={['#0B3D1F', '#14572A', '#1F7135']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.contact, { bottom: pad.bottom(30) - 6 }]}>
        <Image source={LOCAL.appIcon} style={styles.appIcon} />
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={[f(600, 13.5, 1.2), { color: '#fff' }]}>
            Didn’t find it?
          </Txt>
          <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: 'rgba(255,255,255,0.7)' }]}>
            Chat with us about {topic.about}
          </Txt>
        </View>
        <Tap onPress={() => router.push('/support')} pressedStyle={{ backgroundColor: C.limeHover }} style={styles.contactBtn}>
          <Txt numberOfLines={1} style={[f(700, 12.5, 1), { color: C.forest }]}>
            Contact
          </Txt>
        </Tap>
      </Grad>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE8CD',
  },
  back: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 12, paddingHorizontal: 12, gap: 14 },
  intro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEAE6',
    backgroundColor: '#fff',
  },
  letter: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D5EBB0',
    backgroundColor: '#F1F9DF',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  list: { borderRadius: 12, borderWidth: 1, borderColor: '#EAEAE6', backgroundColor: '#fff', overflow: 'hidden' },
  divider: { borderTopWidth: 1, borderTopColor: '#F0F0EC' },
  openBg: { backgroundColor: '#F9FBF5' },
  question: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 12 },
  toggle: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  toggleOpen: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.lime },
  toggleShut: { backgroundColor: '#EFF0EC' },
  answer: { paddingHorizontal: 12, paddingBottom: 14, gap: 12 },
  body: { ...f(400, 13, 1.65), color: '#3F3F3B' },
  steps: { gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#EAEAE6', backgroundColor: '#fff' },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNo: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepText: { ...f(400, 13, 1.5), color: '#3F3F3B', flex: 1, marginTop: -1 },
  note: { ...f(400, 12, 1.55), color: '#8C8C86' },
  helpful: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vote: {
    height: 32,
    minWidth: 52,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3E3DE',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteYes: { borderColor: '#C7E88A', backgroundColor: '#F7FCEE' },
  voteNoOn: { borderColor: '#C9C9C3', backgroundColor: '#F5F6F3' },
  contact: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 12,
    borderRadius: 14,
    boxShadow: '0 10px 24px rgba(11,61,31,0.24)',
  },
  appIcon: { width: 38, height: 38, borderRadius: 10 },
  contactBtn: { marginLeft: 'auto', height: 34, paddingHorizontal: 15, borderRadius: 9, backgroundColor: C.lime, justifyContent: 'center' },
});
