import { ScrollView, View } from 'react-native';

import { Glyph, type GlyphName } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { markAllNotificationsRead, markNotificationRead, useNotificationStore, type AppNotification } from '@/lib/remote-notifications';
import { openLink } from '@/lib/remote-privacy';

const ICON: Record<AppNotification['kind'], GlyphName> = { order_update: 'box', promotional: 'coin', system: 'doc' };

/** "12:04 pm" today, otherwise "2 Nov". */
function when(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/** The customer's notifications: order updates, refund decisions and offers. */
export default function NotificationsScreen() {
  const { items, loaded } = useNotificationStore();
  const unread = items.some((n) => !n.read);

  const open = (n: AppNotification) => {
    if (!n.read) markNotificationRead(n.id);
    openLink(n.link);
  };

  return (
    <Screen>
      <ScreenHeader
        variant="tint"
        title="Notifications"
        subtitle="Order updates and offers"
        right={
          unread ? (
            <Tap accessibilityRole="button" onPress={markAllNotificationsRead} hitSlop={8}>
              <Txt numberOfLines={1} style={[f(600, 12, 1.2), { color: C.green }]}>Mark all read</Txt>
            </Tap>
          ) : undefined
        }
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 8 }} showsVerticalScrollIndicator={false}>
        {items.length === 0 && (
          <Txt style={[f(400, 12.5, 1.5), { color: C.muted, textAlign: 'center', paddingTop: 40 }]}>
            {loaded ? 'No notifications yet. Order updates and offers will show up here.' : 'Loading…'}
          </Txt>
        )}
        {items.map((n) => (
          <Tap
            key={n.id}
            accessibilityRole="button"
            onPress={() => open(n)}
            pressedStyle={{ backgroundColor: '#FAFBF7' }}
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 11,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: C.borderCard,
              backgroundColor: n.read ? '#fff' : '#F7FCEE',
              ...cardShadow,
            }}>
            <Glyph name={ICON[n.kind]} size={17} />
            <View style={{ gap: 3, flex: 1, minWidth: 0 }}>
              <Txt style={f(n.read ? 500 : 700, 13, 1.3)}>{n.title}</Txt>
              {!!n.body && <Txt style={[f(400, 12, 1.4), { color: C.muted }]}>{n.body}</Txt>}
              <Txt numberOfLines={1} style={[f(400, 10.5, 1.2), { color: C.muted2 }]}>{when(n.createdAt)}</Txt>
            </View>
            {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.green, marginTop: 4 }} />}
          </Tap>
        ))}
      </ScrollView>
    </Screen>
  );
}
