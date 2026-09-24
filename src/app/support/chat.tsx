import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Chip, FooterBar, Glyph, IconTile } from '@/components/help/kit';
import { BackIcon } from '@/components/icons';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';
import { goBack } from '@/lib/nav';
import { pickPhoto } from '@/lib/pick-photo';
import { useApp } from '@/store/app-store';

type Msg = { id: string; from: 'agent' | 'me'; text: string; time: string; /** Attached photo URI. */ image?: string };

const INITIAL: Msg[] = [
  {
    id: 'a1',
    from: 'agent',
    text: 'Hi {name}! I can see order #SK10482 was delivered at 12:38 PM. What went wrong with it?',
    time: '12:41 PM',
  },
  { id: 'm1', from: 'me', text: 'The sourdough loaf was missing from the bag.', time: '12:42 PM · Read' },
  {
    id: 'a2',
    from: 'agent',
    text: 'Thanks for flagging that — I’ve refunded $6.50 to your Spice Kart Money. It’s available right now.',
    time: '12:42 PM',
  },
];

const QUICK = ['Thanks!', 'Something else', 'Refund to card'];

/** Canned replies so the demo chat feels live. */
function replyTo(text: string) {
  const t = text.toLowerCase();
  if (t.includes('thank')) return 'You’re welcome! Anything else I can help with today?';
  if (t.includes('card')) return 'No problem — I’ve moved the $6.50 refund to your card instead. It can take 3–5 business days to appear.';
  if (t.includes('photo')) return 'Got the photo, thanks. I’ve added it to your report.';
  if (t.includes('something else')) return 'Sure — tell me what happened and I’ll sort it out.';
  return 'Thanks for the details. I’m checking this with the store now and will update you in a moment.';
}

function clock() {
  const d = new Date();
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

function Avatar({ size, radius, font }: { size: number; radius: number; font: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: C.forest,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
      <Txt style={[f(700, font, 1), { color: C.lime }]}>SK</Txt>
    </View>
  );
}

function Bubble({ m }: { m: Msg }) {
  const me = m.from === 'me';
  const bubble = (
    <View style={{ gap: 4, maxWidth: 250, alignItems: me ? 'flex-end' : 'stretch', flexShrink: 1 }}>
      <View
        style={{
          backgroundColor: me ? C.forest : '#fff',
          borderWidth: me ? 0 : 1,
          borderColor: '#EAEAE6',
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          borderBottomRightRadius: me ? 4 : 12,
          borderBottomLeftRadius: me ? 12 : 4,
          paddingVertical: 10,
          paddingHorizontal: 12,
        }}>
        {m.image ? (
          <Image source={{ uri: m.image }} contentFit="cover" accessibilityLabel="Attached photo" style={{ width: 180, height: 180, borderRadius: 8 }} />
        ) : (
          <Txt style={[f(400, 12.5, 1.55), { color: me ? '#fff' : C.ink }]}>{m.text}</Txt>
        )}
      </View>
      <Txt style={[f(400, 9.5, 1), { color: '#A8A8A2' }]}>{m.time}</Txt>
    </View>
  );
  return me ? (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>{bubble}</View>
  ) : (
    <View style={{ flexDirection: 'row', gap: 9, alignItems: 'flex-end' }}>
      <Avatar size={26} radius={8} font={9.5} />
      {bubble}
    </View>
  );
}

/** Live support chat (`sSupportChat`). */
export default function SupportChatScreen() {
  const pad = usePad();
  const flash = useApp((s) => s.flash);
  const first = useApp((s) => s.user.first);
  const scroll = useRef<ScrollView>(null);
  const [text, setText] = useState('');
  const [sent, setSent] = useState<Msg[]>([]);

  const [typing, setTyping] = useState(false);
  const msgCount = useRef(0);

  // Demo: Priya answers every message after a short "typing" pause.
  const send = (value: string, image?: string) => {
    const t = value.trim();
    if (!t) return;
    const n = ++msgCount.current;
    setSent((s) => [...s, { id: 'u' + n, from: 'me', text: t, time: clock(), image }]);
    setText('');
    setTyping(true);
    requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    setTimeout(() => {
      setTyping(false);
      setSent((s) => [...s, { id: 'a' + n, from: 'agent', text: replyTo(t), time: clock() }]);
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    }, 1400);
  };

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
          gap: 10,
        }}>
        <Tap
          accessibilityLabel="Back"
          onPress={goBack}
          hitSlop={8}
          style={{ width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }}>
          <BackIcon color={C.forest} />
        </Tap>
        <Image source={LOCAL.appIcon} accessibilityLabel="Spice Kart" style={{ width: 34, height: 34, borderRadius: 9 }} />
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={[f(700, 13.5, 1.2), { color: C.forest }]}>
            Spice Kart Support
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: C.lime }} />
            <Txt numberOfLines={1} style={[f(400, 10.5, 1), { color: C.greenMuted }]}>
              Priya connected · replies in ~1 min
            </Txt>
          </View>
        </View>
      </Grad>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          ref={scroll}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>
          <Txt
            numberOfLines={1}
            style={[
              f(500, 9.5, 1),
              {
                alignSelf: 'center',
                color: '#8C8C86',
                backgroundColor: '#EDEEE9',
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 20,
                overflow: 'hidden',
              },
            ]}>
            Today · 12:41 PM
          </Txt>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#EAEAE6',
            }}>
            <IconTile name="box" />
            <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={f(600, 11.5, 1.2)}>
                About order #SK10482
              </Txt>
              <Txt numberOfLines={1} style={[f(400, 10, 1.2), { color: '#8C8C86' }]}>
                Delivered today · 8 items
              </Txt>
            </View>
            <Tap onPress={() => flash('This chat is about your most recent order')} hitSlop={8}>
              <Txt numberOfLines={1} style={[f(600, 11, 1), { color: C.green }]}>
                Change
              </Txt>
            </Tap>
          </View>

          {INITIAL.map((m) => (
            <Bubble key={m.id} m={{ ...m, text: m.text.replace('{name}', first) }} />
          ))}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: '#F7FAF2',
              borderWidth: 1,
              borderColor: '#E4EBD8',
            }}>
            <Glyph name="check" color={C.green} />
            <Txt style={[f(500, 11, 1.4), { color: '#3F5B43', flexShrink: 1 }]}>
              Issue resolved · $6.50 refunded to Spice Kart Money
            </Txt>
          </View>

          {sent.length === 0 && (
            <Animated.View
              exiting={FadeOut.duration(150)}
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {QUICK.map((q) => (
                <Chip key={q} label={q} onPress={() => send(q)} />
              ))}
            </Animated.View>
          )}

          {sent.map((m) => (
            <Animated.View key={m.id} entering={FadeInDown.duration(200)} layout={LinearTransition}>
              <Bubble m={m} />
            </Animated.View>
          ))}
          {typing && (
            <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(120)}>
              <Txt style={[f(400, 11, 1.3), { color: C.muted2, marginLeft: 35 }]}>Priya is typing…</Txt>
            </Animated.View>
          )}
        </ScrollView>

        <FooterBar style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Tap
            accessibilityLabel="Attach photo"
            onPress={async () => {
              const uri = await pickPhoto({ title: 'Send a photo' });
              if (uri) send('photo', uri);
            }}
            style={{
              width: 40,
              height: 44,
              borderWidth: 1,
              borderColor: '#E3E3DE',
              borderRadius: 11,
              backgroundColor: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
            <Glyph name="photo" size={17} />
          </Tap>
          <TextInput
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            placeholder="Type your message…"
            placeholderTextColor="#A8A8A2"
            allowFontScaling={false}
            returnKeyType="send"
            submitBehavior="submit"
            selectionColor={C.green}
            style={[
              f(400, 12.5, 1.2),
              {
                flex: 1,
                minWidth: 0,
                height: 44,
                paddingVertical: 0,
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
            accessibilityLabel="Send"
            onPress={() => (text.trim() ? send(text) : flash('Type a message first'))}
            pressedStyle={{ backgroundColor: C.limeHover }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              backgroundColor: C.lime,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
            <Glyph name="send" size={18} color={C.forest} sw={1.7} />
          </Tap>
        </FooterBar>
      </KeyboardAvoidingView>
    </Screen>
  );
}
