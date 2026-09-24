import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Photo, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { findProduct, type Product } from '@/data/catalog';
import { goTab } from '@/lib/nav';
import { useApp } from '@/store/app-store';

type OrderRow = {
  no: string;
  date: string;
  items: Product[];
  total: string;
  status: string;
  statusBg: string;
  statusColor: string;
  live?: boolean;
};

const TABS = ['Active', 'Past Orders'] as const;

function OrderCard({ o }: { o: OrderRow }) {
  const reorder = () => useApp.getState().reorder(o.items.map((p) => p.id));
  const secondary = () => (o.live ? router.push('/track') : useApp.getState().flash('Receipt sent to your email'));
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardTitle}>
          <Txt numberOfLines={1} style={f(600, 14, 1.2)}>{o.no}</Txt>
          <Txt numberOfLines={1} style={[f(400, 12, 1.25), { color: C.muted }]}>
            {o.date} · {o.items.length} items
          </Txt>
        </View>
        <View style={[styles.status, { backgroundColor: o.statusBg }]}>
          <Txt numberOfLines={1} style={[f(600, 12.5, 1.2), { color: o.statusColor }]}>{o.status}</Txt>
        </View>
      </View>
      <View style={styles.items}>
        {o.items.slice(0, 4).map((p) => (
          <Photo key={p.id} source={p.img} crop={typeof p.img === 'string'} style={styles.thumb} />
        ))}
        <Txt style={[f(700, 16.5, 1.2), { marginLeft: 'auto' }]}>{o.total}</Txt>
      </View>
      <View style={styles.actions}>
        <Tap onPress={reorder} pressedStyle={{ backgroundColor: C.limeHover }} style={[styles.button, styles.reorder]}>
          <Txt style={[f(700, 13.5, 1.2), { color: C.forest }]}>Reorder</Txt>
        </Tap>
        <Tap onPress={secondary} pressedStyle={{ backgroundColor: C.field }} style={[styles.button, styles.secondary]}>
          <Txt style={f(600, 13.5, 1.2)}>{o.live ? 'Track' : 'View receipt'}</Txt>
        </Tap>
      </View>
    </View>
  );
}

export default function OrdersScreen() {
  const pad = usePad();
  const tab = useApp((s) => s.ordersTab);
  const order = useApp((s) => s.order);
  const set = useApp((s) => s.set);

  const list: OrderRow[] =
    tab === 'Active'
      ? order
        ? [
            {
              no: order.no,
              date: 'Today',
              items: order.itemIds.map((id) => findProduct(id)).filter((p): p is Product => !!p),
              total: order.total,
              status: 'Picking',
              statusBg: '#F1F9E2',
              statusColor: C.greenOk,
              live: true,
            },
          ]
        : []
      : // Past orders will come from Supabase once customer accounts are connected.
        [];

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: pad.top(75) }]}>
        <Txt style={f(700, 16.5, 1.2)}>Your orders</Txt>
        <View style={styles.tabs}>
          {TABS.map((t) => {
            const on = tab === t;
            return (
              <Tap
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => set({ ordersTab: t })}
                pressedStyle={{ opacity: 0.6 }}
                style={styles.tab}>
                <Txt style={[f(600, 13.5, 1.2), { color: on ? C.greenDeep : '#5E7266' }]}>{t}</Txt>
              </Tap>
            );
          })}
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}>
        <Animated.View key={tab} entering={FadeIn.duration(180)} style={{ gap: 10 }}>
          {list.length === 0 && (
            <View style={{ alignItems: 'center', gap: 8, paddingVertical: 70, paddingHorizontal: 20 }}>
              <Txt style={[f(700, 15.5, 1.3), { textAlign: 'center' }]}>No orders here yet</Txt>
              <Txt style={[f(400, 12.5, 1.5), { color: C.muted, maxWidth: 220, textAlign: 'center' }]}>
                Your grocery orders will show up here.
              </Txt>
              <Tap
                onPress={() => goTab('home')}
                style={{ marginTop: 6, height: 38, paddingHorizontal: 18, borderRadius: 8, backgroundColor: C.forest, justifyContent: 'center' }}>
                <Txt style={[f(600, 12.5, 1), { color: '#fff' }]}>Start shopping</Txt>
              </Tap>
            </View>
          )}
          {list.map((o) => (
            <OrderCard key={o.no} o={o} />
          ))}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: '#fff', paddingHorizontal: 24, paddingBottom: 20, gap: 10 },
  tabs: { flexDirection: 'row', gap: 17 },
  tab: { paddingHorizontal: 2, paddingBottom: 9 },
  list: { paddingTop: 2, paddingHorizontal: 18, paddingBottom: 120 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, paddingTop: 12, paddingHorizontal: 13, paddingBottom: 12, gap: 11, ...cardShadow },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { gap: 2, flexShrink: 1 },
  status: { marginLeft: 'auto', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 5 },
  items: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  thumb: { width: 39, height: 39, borderRadius: 6 },
  actions: { flexDirection: 'row', gap: 8, marginHorizontal: 3, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.divider },
  button: { flex: 1, height: 37, borderWidth: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  reorder: { borderColor: C.limeBorder, backgroundColor: C.lime },
  secondary: { borderColor: C.border, backgroundColor: '#fff' },
});
