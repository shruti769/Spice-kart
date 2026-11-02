import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';

import { Caption, FooterBar, Glyph, Row, Section, type GlyphName } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { Toggle } from '@/components/ui/toggle';
import { C, f } from '@/constants/theme';
import { pickPhoto } from '@/lib/pick-photo';
import { useOrders } from '@/lib/remote-orders';
import { requestRefund, useRefundStore, type RefundReason } from '@/lib/remote-refunds';
import { openTicket, type SupportTopic } from '@/lib/remote-support';
import { useApp } from '@/store/app-store';

/** [title, sub, icon, support topic, refund reason (null = not about an order)] */
const ISSUES: [string, string, GlyphName, SupportTopic, RefundReason | null][] = [
  ['Missing item', 'Something did not arrive in the bag', 'box', 'orders', 'missing_item'],
  ['Damaged item', 'Arrived crushed, leaking or spoiled', 'flag', 'orders', 'damaged_item'],
  ['Delivery issue', 'Late, wrong address or no-show', 'truck', 'delivery', 'delivery_issue'],
  ['Payment issue', 'Wrong amount or double charge', 'card', 'payments', 'payment_issue'],
  ['Refund issue', 'Refund missing or incorrect', 'refund', 'refunds', 'refund_issue'],
  ['Account issue', 'Login, details or notifications', 'user', 'account', null],
];

const ORDER_STATUS: Record<string, string> = {
  placed: 'placed',
  confirmed: 'confirmed',
  picking: 'being picked',
  packed: 'packed',
  out_for_delivery: 'out for delivery',
  delivered: 'delivered',
  cancelled: 'cancelled',
};

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
  const { order: orderParam } = useLocalSearchParams<{ order?: string }>();
  const { orders } = useOrders();
  const order = (orderParam ? orders.find((o) => o.id === orderParam) : orders[0]) ?? null;
  const [detail, setDetail] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [wantRefund, setWantRefund] = useState(false);
  const account = (issueIdx || 0) === 5;
  const about = account ? null : order;
  // One request at a time per order: the admin decides it before another can be made.
  const openRefund = useRefundStore((s) => (about ? s.refunds.find((r) => r.orderId === about.id && r.status === 'pending') : undefined));
  const refund = wantRefund && !!about && !openRefund;

  // Opens a support chat with the report as its first message (and asks for the refund), then shows it.
  const submit = async () => {
    if (sending) return;
    const [title, sub, , topic, reason] = ISSUES[issueIdx || 0];
    const text = detail.trim() || `${title}: ${sub.toLowerCase()}.`;
    setSending(true);
    try {
      const id = await openTicket({
        subject: about ? `${title} · #${about.no}` : title,
        message: refund ? `${text}\n\nI’d like to request a refund.` : text,
        topic,
        orderId: about?.id ?? null,
        photoUri: photo,
      });
      // The report is already with support, so a failed request doesn't stop them reaching the chat.
      if (refund && about && reason) {
        await requestRefund({ orderId: about.id, reason, detail: text }).catch(() => flash('Your report was sent, but the refund request wasn’t. Please ask in this chat'));
      }
      router.replace({ pathname: '/support/chat', params: { ticket: id } });
    } catch (e) {
      setSending(false);
      flash(`Couldn’t send your report · ${(e as Error).message}`);
    }
  };
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
      <ScreenHeader
        variant="tint"
        title="Report an issue"
        subtitle={
          order
            ? `Order #${order.no} · ${ORDER_STATUS[order.status] ?? order.status}${new Date(order.createdAt).toDateString() === new Date().toDateString() ? ' today' : ''}`
            : 'Tell us what went wrong'
        }
      />
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

          {!!about && (
            <Section title="REFUND">
              {openRefund ? (
                <Row icon="refund" title={`${openRefund.number} is under review`} sub={`We’ll let you know about order #${about.no}`} subNoWrap padV={12} />
              ) : (
                <Row
                  icon="refund"
                  title="Request a refund"
                  sub={`Our team will review order #${about.no}`}
                  weight={600}
                  subNoWrap
                  padV={12}
                  right={<Toggle value={wantRefund} onChange={() => setWantRefund((v) => !v)} label="Request a refund" />}
                  onPress={() => setWantRefund((v) => !v)}
                />
              )}
            </Section>
          )}

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
            onPress={submit}
            disabled={sending}
            pressedStyle={{ backgroundColor: C.limeHover }}
            style={{
              height: 48,
              borderRadius: 12,
              backgroundColor: C.lime,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 14px rgba(107,176,0,0.24)',
            }}>
            {sending ? <ActivityIndicator color={C.forest} /> : <Txt style={[f(700, 14, 1.2), { color: C.forest }]}>Continue to chat</Txt>}
          </Tap>
        </FooterBar>
      </KeyboardAvoidingView>
    </Screen>
  );
}
