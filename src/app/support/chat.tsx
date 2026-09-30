import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Chip, FooterBar, Glyph, IconTile } from '@/components/help/kit';
import { BackIcon } from '@/components/icons';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';
import { goBack } from '@/lib/nav';
import { pickPhoto } from '@/lib/pick-photo';
import { useOrders, type Order } from '@/lib/remote-orders';
import {
  guessTopic,
  markTicketRead,
  openTicket,
  rateTicket,
  sendChatMessage,
  useChat,
  useSupportTickets,
  type ChatMessage,
  type SupportTopic,
} from '@/lib/remote-support';
import { useApp } from '@/store/app-store';

type Msg = { id: string; from: 'agent' | 'me'; text: string; time: string; /** Attached photo URI. */ image?: string; pending?: boolean };

const QUICK_NEW = ['Something is missing', 'Where is my order?', 'Refund status'];
const QUICK_OPEN = ['Thanks!', 'Something else', 'Refund to card'];

const STATUS_LABEL: Record<string, string> = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  picking: 'Being picked',
  packed: 'Packed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

function clock(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "Today · 12:41 PM", "Yesterday · 9:10 AM", "24 Sep · 6:00 PM" */
function dayLabel(iso: string) {
  const d = new Date(iso);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const day =
    d >= start ? 'Today' : d.getTime() >= start.getTime() - 864e5 ? 'Yesterday' : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  return `${day} · ${clock(iso)}`;
}

/** "Delivered today · 8 items" */
function orderLine(o: Order) {
  const items = o.items.reduce((n, i) => n + i.qty, 0);
  const today = new Date(o.createdAt).toDateString() === new Date().toDateString();
  return `${STATUS_LABEL[o.status] ?? o.status}${today ? ' today' : ''} · ${items} item${items === 1 ? '' : 's'}`;
}

const toMsg = (m: ChatMessage): Msg => ({
  id: m.id,
  from: m.from,
  text: m.text,
  image: m.image,
  pending: m.pending,
  time: m.pending ? 'Sending…' : clock(m.at),
});

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
    <View style={{ gap: 4, maxWidth: 250, alignItems: me ? 'flex-end' : 'stretch', flexShrink: 1, opacity: m.pending ? 0.6 : 1 }}>
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
        {!!m.image && (
          <Image source={{ uri: m.image }} contentFit="cover" accessibilityLabel="Attached photo" style={{ width: 180, height: 180, borderRadius: 8 }} />
        )}
        {!!m.text && <Txt style={[f(400, 12.5, 1.55), { color: me ? '#fff' : C.ink, marginTop: m.image ? 8 : 0 }]}>{m.text}</Txt>}
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

function Stars({ onRate }: { onRate: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Tap key={n} accessibilityLabel={`${n} star${n === 1 ? '' : 's'}`} onPress={() => onRate(n)} hitSlop={4}>
          <Txt style={[f(600, 22, 1), { color: '#C89A28' }]}>☆</Txt>
        </Tap>
      ))}
    </View>
  );
}

/**
 * Live support chat (`sSupportChat`). `?ticket=<id>` opens that chat; otherwise it continues the
 * latest open chat, or starts a new one (about `?order=<id>` or the latest recent order).
 */
export default function SupportChatScreen() {
  const pad = usePad();
  const flash = useApp((s) => s.flash);
  const first = useApp((s) => s.user.first);
  const params = useLocalSearchParams<{ ticket?: string; order?: string }>();
  const scroll = useRef<ScrollView>(null);
  const seq = useRef(0);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const { tickets, loaded } = useSupportTickets();
  const { orders } = useOrders();
  // A chat opened here (new chat → its ticket) sticks for the rest of the visit.
  const [openedId, setOpenedId] = useState<string | null>(params.ticket ?? null);
  const ticketId = openedId ?? (loaded ? tickets.find((t) => t.status !== 'resolved')?.id ?? null : null);
  const ticket = tickets.find((t) => t.id === ticketId) ?? null;
  const chat = useChat(ticketId);
  const { setPending } = chat;
  const isNew = !ticketId;

  // New chats are about the order passed in, else an order from the last 3 days.
  const [pickedOrder, setPickedOrder] = useState<string | null | undefined>(params.order);
  const [openedAt] = useState(() => Date.now());
  const recentOrder = orders.find((o) => openedAt - new Date(o.createdAt).getTime() < 3 * 864e5) ?? null;
  const newOrderId = pickedOrder === undefined ? recentOrder?.id ?? null : pickedOrder;
  const about: Order | null = isNew ? orders.find((o) => o.id === newOrderId) ?? null : orders.find((o) => o.id === ticket?.orderId) ?? null;
  const aboutNo = about?.no ?? (isNew ? null : ticket?.orderNo ?? null);

  const messages = useMemo(() => chat.messages.map(toMsg), [chat.messages]);
  const agentName = [...chat.messages].reverse().find((m) => m.from === 'agent')?.author;
  const lastId = messages[messages.length - 1]?.id;

  // Stay at the newest message and clear the unread dot while the chat is open.
  useEffect(() => {
    requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    if (ticketId && ticket?.unread) markTicketRead(ticketId);
  }, [lastId, ticketId, ticket?.unread]);

  const changeOrder = () => {
    if (!isNew) return flash('Start a new chat to ask about a different order');
    Alert.alert('Which order is this about?', undefined, [
      ...orders.slice(0, 4).map((o) => ({ text: `#${o.no} · ${orderLine(o)}`, onPress: () => setPickedOrder(o.id) })),
      { text: 'Not about an order', onPress: () => setPickedOrder(null) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const send = async (value: string, image?: string) => {
    const t = value.trim();
    if ((!t && !image) || sending) return;
    const temp: ChatMessage = { id: `tmp-${++seq.current}`, from: 'me', author: '', text: t, image, at: '', pending: true };
    setSending(true);
    setText('');
    setPending((p) => [...p, temp]);
    try {
      if (ticketId) {
        await sendChatMessage(ticketId, t, image);
        chat.reload();
      } else {
        const topic: SupportTopic = guessTopic(t, !!newOrderId);
        const id = await openTicket({ subject: t.slice(0, 80) || 'Photo', message: t, topic, orderId: newOrderId, photoUri: image });
        setOpenedId(id);
      }
    } catch (e) {
      setPending((p) => p.filter((m) => m.id !== temp.id));
      setText(t);
      flash(`Couldn’t send · ${(e as Error).message}`);
    } finally {
      setSending(false);
    }
  };

  const rate = async (n: number) => {
    if (!ticketId) return;
    try {
      await rateTicket(ticketId, n);
      flash('Thanks for rating our support');
    } catch (e) {
      flash((e as Error).message);
    }
  };

  const status = ticket?.status;
  const subtitle = isNew
    ? 'Our Melbourne team usually replies in minutes'
    : status === 'resolved'
      ? 'Chat resolved · send a message to reopen'
      : agentName
        ? `${agentName} · Spice Kart Support`
        : 'Waiting for the next available agent';
  const quick = isNew ? QUICK_NEW : status === 'resolved' ? [] : QUICK_OPEN;
  const lastIsMine = messages[messages.length - 1]?.from === 'me';

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
              {subtitle}
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
          {!!(messages[0] || isNew) && (
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
              {isNew ? 'New chat' : [ticket?.number, chat.messages[0]?.at && dayLabel(chat.messages[0].at)].filter(Boolean).join(' · ')}
            </Txt>
          )}

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
            <IconTile name={aboutNo ? 'box' : 'chat'} />
            <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={f(600, 11.5, 1.2)}>
                {aboutNo ? `About order #${aboutNo}` : isNew ? 'General question' : ticket?.subject ?? 'Your chat'}
              </Txt>
              <Txt numberOfLines={1} style={[f(400, 10, 1.2), { color: '#8C8C86' }]}>
                {about ? orderLine(about) : isNew ? 'Not about a specific order' : 'Spice Kart Support'}
              </Txt>
            </View>
            {isNew && orders.length > 0 && (
              <Tap onPress={changeOrder} hitSlop={8}>
                <Txt numberOfLines={1} style={[f(600, 11, 1), { color: C.green }]}>
                  Change
                </Txt>
              </Tap>
            )}
          </View>

          {isNew && (
            <Bubble m={{ id: 'hello', from: 'agent', text: `Hi ${first || 'there'}! How can we help today? Tell us what happened and a member of our team will reply here.`, time: '' }} />
          )}
          {chat.loading && !messages.length && <ActivityIndicator color={C.green} style={{ marginTop: 20 }} />}

          {messages.map((m) => (
            <Animated.View key={m.id} entering={FadeInDown.duration(200)} layout={LinearTransition}>
              <Bubble m={m} />
            </Animated.View>
          ))}

          {!isNew && status !== 'resolved' && lastIsMine && !sending && (
            <Txt style={[f(400, 11, 1.3), { color: C.muted2, marginLeft: 35 }]}>
              {agentName ? `${agentName.split(' ')[0]} will reply here soon` : 'Sent · our team will reply here soon'}
            </Txt>
          )}

          {status === 'resolved' && (
            <View
              style={{
                gap: 10,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: '#F7FAF2',
                borderWidth: 1,
                borderColor: '#E4EBD8',
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Glyph name="check" color={C.green} />
                <Txt style={[f(500, 11, 1.4), { color: '#3F5B43', flexShrink: 1 }]}>
                  {ticket?.csat ? `Issue resolved · you rated us ${ticket.csat}/5` : 'Issue resolved · how did we do?'}
                </Txt>
              </View>
              {!ticket?.csat && <Stars onRate={rate} />}
            </View>
          )}

          {quick.length > 0 && !sending && (isNew || !lastIsMine) && (
            <Animated.View exiting={FadeOut.duration(150)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {quick.map((q) => (
                <Chip key={q} label={q} onPress={() => send(q)} />
              ))}
            </Animated.View>
          )}
        </ScrollView>

        <FooterBar style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Tap
            accessibilityLabel="Attach photo"
            onPress={async () => {
              const uri = await pickPhoto({ title: 'Send a photo' });
              if (uri) send(text, uri);
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
            disabled={sending}
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
