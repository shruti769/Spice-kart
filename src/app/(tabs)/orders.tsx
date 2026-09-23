import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Photo, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { byNames, findProduct, type Product } from '@/data/catalog';
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

const PAST: OrderRow[] = [
  {
    no: 'Order #SK10482',
    date: '14 Aug 2026',
    items: byNames(['Full Cream Milk', 'Truss Tomatoes', 'Sourdough Loaf', 'Free Range Eggs', 'Baby Spinach']),
    total: '$32.40',
    status: 'Delivered',
    statusBg: '#EEF2EC',
    statusColor: '#54675C',
  },
  {
    no: 'Order #SK10391',
    date: '7 Aug 2026',
    items: byNames(['Basmati Rice', 'Garam Masala', 'Red Lentils', 'Brown Onions']),
    total: '$27.90',
    status: 'Delivered',
    statusBg: '#EEF2EC',
    statusColor: '#54675C',
  },
];

const TABS = ['Active', 'Past Orders'] as const;

function OrderCard({ o }: { o: OrderRow }) {
  const reorder = () => useApp.getState().reorder(o.items.map((p) => p.id));
  const secondary = () => (o.live ? router.push('/track') : useApp.getState().flash('Receipt sent to your email'));
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, padding: 12, gap: 10, ...cardShadow }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ gap: 3, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>{o.no}</Txt>
          <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted }]}>
            {o.date} · {o.items.length} items
          </Txt>
        </View>
        <View style={{ marginLeft: 'auto', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 5, backgroundColor: o.statusBg }}>
          <Txt numberOfLines={1} style={[f(600, 10.5, 1), { color: o.statusColor }]}>{o.status}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
        {o.items.slice(0, 4).map((p) => (
          <Photo key={p.id} source={p.img} style={{ width: 38, height: 38, borderRadius: 6 }} />
        ))}
        <Txt style={[f(700, 14, 1), { marginLeft: 'auto' }]}>{o.total}</Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 8, paddingTop: 2, borderTopWidth: 1, borderTopColor: C.dividerSoft }}>
        <Tap
          onPress={reorder}
          style={{ flex: 1, height: 36, marginTop: 8, borderWidth: 1, borderColor: C.limeBorder, backgroundColor: C.lime, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={[f(700, 12, 1), { color: C.forest }]}>Reorder</Txt>
        </Tap>
        <Tap
          onPress={secondary}
          style={{ flex: 1, height: 36, marginTop: 8, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', borderRadius: 7, alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={f(600, 12, 1)}>{o.live ? 'Track' : 'View receipt'}</Txt>
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
      : PAST;

  return (
    <Screen>
      <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: C.divider, paddingTop: pad.top(54), paddingHorizontal: 14, gap: 10 }}>
        <Txt style={f(700, 16, 1.2)}>Your orders</Txt>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          {TABS.map((t) => {
            const on = tab === t;
            return (
              <Tap
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                onPress={() => set({ ordersTab: t })}
                pressedStyle={{ opacity: 0.6 }}
                style={{ borderBottomWidth: 2, borderBottomColor: on ? '#fff' : 'transparent', paddingHorizontal: 2, paddingBottom: 9 }}>
                <Txt style={[f(600, 12.5, 1), { color: on ? C.greenDeep : '#5E7266' }]}>{t}</Txt>
              </Tap>
            );
          })}
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 120 }}
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
