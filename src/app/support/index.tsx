import { router } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';

import { Caption, Card, Glyph, IconTile, Row, Section } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

function Badge({ children }: { children: string }) {
  return (
    <Txt
      numberOfLines={1}
      style={[
        f(600, 9.5, 1),
        { color: C.green, backgroundColor: '#F1F9DF', paddingVertical: 6, paddingHorizontal: 7, borderRadius: 5, overflow: 'hidden' },
      ]}>
      {children}
    </Txt>
  );
}

/** Contact support hub (`sSupport`). */
export default function SupportScreen() {
  const flash = useApp((s) => s.flash);
  const openIssue = () => router.push('/support/issue');

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Contact support" subtitle="Melbourne team · online now" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <View
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
          <View
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: C.lime,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Glyph name="chat" size={17} color={C.forest} sw={1.6} />
          </View>
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Txt numberOfLines={1} style={[f(600, 12.5, 1.2), { color: C.forest }]}>
              Average reply time: 1 min
            </Txt>
            <Txt numberOfLines={1} style={[f(400, 10.5, 1.3), { color: '#5F6B57' }]}>
              Live chat is the fastest way to reach us
            </Txt>
          </View>
        </View>

        <Section title="GET IN TOUCH">
          <Row
            icon="chat"
            title="Live chat"
            sub="Chat with a support specialist"
            weight={600}
            subNoWrap
            padV={12}
            right={<Badge>~1 min</Badge>}
            onPress={() => router.push('/support/chat')}
          />
          <Row
            icon="mail"
            title="Email support"
            sub="help@spicekart.com.au"
            weight={600}
            subNoWrap
            padV={12}
            right={<Badge>~4 hrs</Badge>}
            onPress={() => Linking.openURL('mailto:help@spicekart.com.au?subject=Help%20with%20my%20order').catch(() => flash('No email app found'))}
          />
          <Row
            icon="phone"
            title="Call support"
            sub="1800 774 235 · free call"
            weight={600}
            subNoWrap
            padV={12}
            right={<Badge>24/7</Badge>}
            onPress={() => Linking.openURL('tel:1800774235').catch(() => flash('Calling is not available on this device'))}
          />
        </Section>

        <Section title="SELF SERVICE">
          <Row
            icon="question"
            title="Help centre"
            sub="Answers to common questions"
            chevron
            onPress={() => router.push('/help')}
          />
          <Row
            icon="flag"
            title="Report an issue"
            sub="Missing item, damage or delivery problem"
            chevron
            onPress={openIssue}
          />
        </Section>

        <View style={{ gap: 8 }}>
          <Caption>RECENT ORDER</Caption>
          <Card style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, overflow: 'visible' }}>
            <IconTile name="box" />
            <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>
                Order #SK10482
              </Txt>
              <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: '#8C8C86' }]}>
                Delivered today · 8 items · $42.80
              </Txt>
            </View>
            <Tap
              onPress={openIssue}
              pressedStyle={{ backgroundColor: '#FAFBF7' }}
              style={{
                height: 32,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#E3E3DE',
                borderRadius: 9,
                backgroundColor: '#fff',
                justifyContent: 'center',
              }}>
              <Txt numberOfLines={1} style={f(600, 11.5, 1)}>
                Get help
              </Txt>
            </Tap>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
