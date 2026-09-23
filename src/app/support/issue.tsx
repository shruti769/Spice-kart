import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from 'react-native';

import { Caption, FooterBar, Glyph, Row, Section, type GlyphName } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

const ISSUES: [string, string, GlyphName][] = [
  ['Missing item', 'Something did not arrive in the bag', 'box'],
  ['Damaged item', 'Arrived crushed, leaking or spoiled', 'flag'],
  ['Delivery issue', 'Late, wrong address or no-show', 'truck'],
  ['Payment issue', 'Wrong amount or double charge', 'card'],
  ['Refund issue', 'Refund missing or incorrect', 'refund'],
  ['Account issue', 'Login, details or notifications', 'user'],
];

function Radio({ on }: { on: boolean }) {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: on ? C.lime : '#C9C9C3',
        backgroundColor: on ? C.lime : 'transparent',
        flexShrink: 0,
      }}
    />
  );
}

/** Report an issue (`sSupportIssue`). */
export default function SupportIssueScreen() {
  const issueIdx = useApp((s) => s.issueIdx);
  const set = useApp((s) => s.set);
  const flash = useApp((s) => s.flash);
  const [detail, setDetail] = useState('');

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Report an issue" subtitle="Order #SK10482 · delivered today" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>
          <Section title="WHAT WENT WRONG?">
            {ISSUES.map(([title, sub, icon], i) => (
              <Row
                key={title}
                icon={icon}
                title={title}
                sub={sub}
                weight={600}
                subNoWrap
                padV={12}
                bg={(issueIdx || 0) === i ? '#F7FCEE' : 'transparent'}
                right={<Radio on={(issueIdx || 0) === i} />}
                onPress={() => set({ issueIdx: i })}
              />
            ))}
          </Section>

          <View style={{ gap: 8 }}>
            <Caption>TELL US MORE (OPTIONAL)</Caption>
            <TextInput
              value={detail}
              onChangeText={setDetail}
              multiline
              placeholder="Add any detail that helps us fix it faster…"
              placeholderTextColor="#A8A8A2"
              allowFontScaling={false}
              selectionColor={C.green}
              textAlignVertical="top"
              style={[
                f(400, 12.5, 1.6),
                {
                  minHeight: 78,
                  paddingTop: 11,
                  paddingBottom: 11,
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: '#E3E3DE',
                  borderRadius: 11,
                  backgroundColor: '#FAFAF8',
                  color: C.ink,
                },
              ]}
            />
            <Tap
              onPress={() => flash('Coming soon')}
              pressedStyle={{ borderColor: C.lime }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                height: 44,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#C7C7C1',
                borderRadius: 11,
                backgroundColor: '#fff',
              }}>
              <Glyph name="photo" size={16} />
              <Txt numberOfLines={1} style={[f(500, 12, 1), { color: '#7A7A75' }]}>
                Attach a photo
              </Txt>
            </Tap>
          </View>
        </ScrollView>

        <FooterBar>
          <Tap
            onPress={() => router.push('/support/chat')}
            pressedStyle={{ backgroundColor: C.forestHover }}
            style={{
              height: 48,
              borderRadius: 11,
              backgroundColor: C.forest,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 14px rgba(11,61,31,0.18)',
            }}>
            <Txt style={[f(700, 14, 1), { color: '#fff' }]}>Continue to chat</Txt>
          </Tap>
        </FooterBar>
      </KeyboardAvoidingView>
    </Screen>
  );
}
