import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';

import { Caption, FooterBar, Glyph, Row, Section, type GlyphName } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { pickPhoto } from '@/lib/pick-photo';
import { useApp } from '@/store/app-store';

const ISSUES: [string, string, GlyphName][] = [
  ['Missing item', 'Something did not arrive in the bag', 'box'],
  ['Damaged item', 'Arrived crushed, leaking or spoiled', 'flag'],
  ['Delivery issue', 'Late, wrong address or no-show', 'truck'],
  ['Payment issue', 'Wrong amount or double charge', 'card'],
  ['Refund issue', 'Refund missing or incorrect', 'refund'],
  ['Account issue', 'Login, details or notifications', 'user'],
];

/** Selected: lime rounded square. Unselected: grey ring (as in the design). */
function Radio({ on }: { on: boolean }) {
  return on ? (
    <View style={{ width: 20, height: 20, borderRadius: 6.5, backgroundColor: C.lime, flexShrink: 0 }} />
  ) : (
    <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D6DDD6', flexShrink: 0 }} />
  );
}

/** Report an issue (`sSupportIssue`). */
export default function SupportIssueScreen() {
  const issueIdx = useApp((s) => s.issueIdx);
  const set = useApp((s) => s.set);
  const flash = useApp((s) => s.flash);
  const [detail, setDetail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const attach = async () => {
    if (photo) {
      setPhoto(null);
      flash('Photo removed');
      return;
    }
    const uri = await pickPhoto({ title: 'Attach a photo' });
    if (uri) setPhoto(uri);
  };

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Report an issue" subtitle="Order #SK10482 · delivered today" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
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
              onPress={attach}
              pressedStyle={{ borderColor: C.lime }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                minHeight: 44,
                paddingVertical: photo ? 8 : 0,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: '#C7C7C1',
                borderRadius: 11,
                backgroundColor: '#fff',
              }}>
              {photo ? (
                <Image source={{ uri: photo }} contentFit="cover" style={{ width: 44, height: 44, borderRadius: 8 }} />
              ) : (
                <Glyph name="photo" size={16} />
              )}
              <Txt numberOfLines={1} style={[f(500, 12, 1.2), { color: photo ? C.green : '#7A7A75' }]}>
                {photo ? '1 photo attached · tap to remove' : 'Attach a photo'}
              </Txt>
            </Tap>
          </View>
        </ScrollView>

        <FooterBar>
          <Tap
            onPress={() => router.push('/support/chat')}
            pressedStyle={{ backgroundColor: C.limeHover }}
            style={{
              height: 48,
              borderRadius: 12,
              backgroundColor: C.lime,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 14px rgba(107,176,0,0.24)',
            }}>
            <Txt style={[f(700, 14, 1.2), { color: C.forest }]}>Continue to chat</Txt>
          </Tap>
        </FooterBar>
      </KeyboardAvoidingView>
    </Screen>
  );
}
