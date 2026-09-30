import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';

import { Caption, FooterBar, Glyph, Row, Section, type GlyphName } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { pickPhoto } from '@/lib/pick-photo';
import { useOrders } from '@/lib/remote-orders';
import { openTicket, type SupportTopic } from '@/lib/remote-support';
import { useApp } from '@/store/app-store';

/** [title, sub, icon, support topic] */
const ISSUES: [string, string, GlyphName, SupportTopic][] = [
  ['Missing item', 'Something did not arrive in the bag', 'box', 'orders'],
  ['Damaged item', 'Arrived crushed, leaking or spoiled', 'flag', 'orders'],
  ['Delivery issue', 'Late, wrong address or no-show', 'truck', 'delivery'],
  ['Payment issue', 'Wrong amount or double charge', 'card', 'payments'],
  ['Refund issue', 'Refund missing or incorrect', 'refund', 'refunds'],
  ['Account issue', 'Login, details or notifications', 'user', 'account'],
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
  const account = (issueIdx || 0) === 5;

  // Opens a support chat with the report as its first message, then shows it.
  const submit = async () => {
    if (sending) return;
    const [title, sub, , topic] = ISSUES[issueIdx || 0];
    const about = account ? null : order;
    setSending(true);
    try {
      const id = await openTicket({
        subject: about ? `${title} · #${about.no}` : title,
        message: detail.trim() || `${title}: ${sub.toLowerCase()}.`,
        topic,
        orderId: about?.id ?? null,
        photoUri: photo,
      });
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
