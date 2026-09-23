import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { BottomNav } from '@/components/bottom-nav';
import { slotLabelOf } from '@/components/checkout/slot';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

const LIME = C.lime;
const ACTIVE = 2;
const TRACK_DEFS: [string, string][] = [
  ['Order placed', '12:04 PM'],
  ['Order confirmed', '12:05 PM'],
  ['Picking your groceries', 'In progress'],
  ['Packed', 'Next'],
  ['Out for delivery', 'Est. 12:22 PM'],
  ['Delivered', 'Est. 12:38 PM'],
];
const TRACK_HEAD = 'Marcus is picking your order';

/** `linear-gradient(rgba(11,61,31,.055) 1px, transparent 1px)` 28px map grid. */
const GRID = Array.from({ length: 24 }, (_, i) => i * 28);

/** Soft lime ring pulsing behind the active step dot. */
function Pulse() {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
  }, [v]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - v.value),
    transform: [{ scale: 1 + v.value * 0.9 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: 0, width: 16, height: 16, borderRadius: 8, backgroundColor: LIME }, style]}
    />
  );
}

function MapCard() {
  const zoom = { width: 28, height: 28, borderWidth: 1, borderColor: '#DDE3D4', borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ height: 196, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E3E7DC', backgroundColor: '#EEF1E8' }}>
      <Svg style={StyleSheet.absoluteFill}>
        {GRID.map((p) => (
          <Line key={'h' + p} x1={0} x2={2000} y1={p + 0.5} y2={p + 0.5} stroke="rgba(11,61,31,0.055)" strokeWidth={1} />
        ))}
        {GRID.map((p) => (
          <Line key={'v' + p} y1={0} y2={2000} x1={p + 0.5} x2={p + 0.5} stroke="rgba(11,61,31,0.055)" strokeWidth={1} />
        ))}
      </Svg>
      <Svg viewBox="0 0 374 196" style={StyleSheet.absoluteFill}>
        <Path d="M-10 62h394M-10 136h394M92 -10v216M258 -10v216" stroke="#DDE3D4" strokeWidth={9} />
        <Path d="M-10 62h394M-10 136h394M92 -10v216M258 -10v216" stroke="#F4F6F0" strokeWidth={5} />
        <Rect x={18} y={18} width={58} height={30} rx={4} fill="#E4E9DD" />
        <Rect x={112} y={14} width={128} height={34} rx={4} fill="#E4E9DD" />
        <Rect x={276} y={20} width={84} height={28} rx={4} fill="#E4E9DD" />
        <Rect x={16} y={152} width={62} height={32} rx={4} fill="#E4E9DD" />
        <Rect x={118} y={150} width={118} height={34} rx={4} fill="#E4E9DD" />
        <Rect x={272} y={154} width={88} height={30} rx={4} fill="#E4E9DD" />
        <Path d="M56 168 C 92 168, 92 122, 140 118 S 214 96, 258 84" stroke={LIME} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M258 84 C 292 76, 306 66, 322 44" stroke="#B9C6AC" strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray="8 8" />
        <Circle cx={56} cy={168} r={6} fill={C.forest} />
        <Circle cx={258} cy={84} r={17} fill={LIME} fillOpacity={0.26} />
        <Circle cx={258} cy={84} r={9} fill="#fff" stroke={C.forest} strokeWidth={3} />
        <Circle cx={322} cy={44} r={7} fill="#fff" stroke={C.forest} strokeWidth={3} />
      </Svg>
      <View
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          backgroundColor: 'rgba(255,255,255,0.95)',
          borderWidth: 1,
          borderColor: '#E3E7DC',
          borderRadius: 20,
          paddingVertical: 6,
          paddingHorizontal: 10,
        }}>
        <View style={{ width: 7, height: 7, borderRadius: 5, backgroundColor: LIME }} />
        <Txt numberOfLines={1} style={[f(600, 10.5, 1), { color: C.forest }]}>Marcus is 1.8 km away</Txt>
      </View>
      <Txt numberOfLines={1} style={[f(500, 9.5, 1), { position: 'absolute', bottom: 10, left: 10, color: '#7A857A' }]}>
        Collingwood → 123 Collins Street
      </Txt>
      <View style={{ position: 'absolute', bottom: 10, right: 10, gap: 5 }}>
        <View style={zoom}>
          <Txt style={[f(600, 14, 1), { color: C.ink2 }]}>+</Txt>
        </View>
        <View style={zoom}>
          <Txt style={[f(600, 14, 1), { color: C.ink2 }]}>−</Txt>
        </View>
      </View>
    </View>
  );
}

export default function TrackScreen() {
  const order = useApp((s) => s.order);
  const slot = useApp((s) => s.slot);
  const schDay = useApp((s) => s.schDay);

  return (
    <Screen>
      <ScreenHeader title="Track order" subtitle={order ? order.no : 'Order #SK10500'} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 120, gap: 10 }}
        showsVerticalScrollIndicator={false}>
        <MapCard />

        <View style={{ backgroundColor: C.forest, borderRadius: 9, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Txt style={[f(500, 10.5, 1), { letterSpacing: 0.5, color: 'rgba(255,255,255,0.6)' }]}>ESTIMATED ARRIVAL</Txt>
            <Txt style={[f(700, 16, 1), { color: '#fff' }]}>{slotLabelOf(slot, schDay)}</Txt>
          </View>
          <Txt style={[f(600, 10.5, 1), { marginLeft: 'auto', color: LIME }]}>ON TIME</Txt>
        </View>

        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, paddingTop: 14, paddingHorizontal: 14, paddingBottom: 4, ...cardShadow }}>
          {TRACK_DEFS.map(([label, time], i) => {
            const done = i < ACTIVE;
            const reached = i <= ACTIVE;
            return (
              <View key={label} style={{ flexDirection: 'row', gap: 11, alignItems: 'flex-start' }}>
                <View style={{ alignItems: 'center', flexShrink: 0, alignSelf: 'stretch' }}>
                  <View style={{ width: 16, height: 16 }}>
                    {i === ACTIVE && <Pulse />}
                    <View
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 8,
                        backgroundColor: reached ? LIME : '#fff',
                        borderWidth: 2,
                        borderColor: reached ? LIME : 'rgba(12,43,26,0.18)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      {done && <Txt style={[f(700, 9, 1), { color: C.forest }]}>✓</Txt>}
                    </View>
                  </View>
                  <View style={{ flex: 1, width: 2, minHeight: 22, backgroundColor: done ? LIME : 'rgba(12,43,26,0.10)' }} />
                </View>
                <View style={{ gap: 2, paddingBottom: 16, flex: 1, minWidth: 0 }}>
                  <Txt numberOfLines={1} style={[f(600, 12.5, 1.25), { color: reached ? C.greenDeep : '#8A9A8E' }]}>{label}</Txt>
                  <Txt numberOfLines={1} style={[f(400, 11, 1.25), { color: C.muted2 }]}>{time}</Txt>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 11, ...cardShadow }}>
          <View style={{ width: 38, height: 38, borderRadius: 8, backgroundColor: '#EEF2E9', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Txt style={[f(700, 12.5, 1), { color: C.green }]}>MT</Txt>
          </View>
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Txt numberOfLines={1} style={f(600, 12.5, 1.2)}>Marcus T · your shopper</Txt>
            <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted }]}>{TRACK_HEAD}</Txt>
          </View>
          <Tap
            accessibilityLabel="Call shopper"
            style={{ marginLeft: 'auto', width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Svg width={15} height={15} viewBox="0 0 18 18" fill="none">
              <Path
                d="M4 3h3l1.4 3.4-2 1.3a9 9 0 004 4l1.3-2L15 11.2V14a1 1 0 01-1.1 1A12 12 0 013 4.1 1 1 0 014 3z"
                stroke={C.forest}
                strokeWidth={1.5}
                strokeLinejoin="round"
              />
            </Svg>
          </Tap>
        </View>
      </ScrollView>
      <BottomNav active="orders" showCartBar={false} />
    </Screen>
  );
}
