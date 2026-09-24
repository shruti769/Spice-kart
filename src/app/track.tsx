import { useEffect } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BottomNav } from '@/components/bottom-nav';
import { slotLabelOf } from '@/components/checkout/slot';
import { Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
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

/** Soft lime ring pulsing behind the active step dot. */
function Pulse() {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false));
  }, [v]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - v.value),
    transform: [{ scale: 1 + v.value * 0.9 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top: 0, width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: LIME }, style]}
    />
  );
}

function MapCard() {
  return (
    <View style={styles.map}>
      <Svg viewBox="0 0 367 200" style={StyleSheet.absoluteFill}>
        <Path d="M-10 58h387M-10 140h387M95 -10v220M263 -10v220" stroke="#F4F6F1" strokeWidth={8} />
        <Rect x={19} y={13} width={67} height={34} rx={4} fill="#E5E9DE" />
        <Rect x={114} y={13} width={130} height={34} rx={4} fill="#E5E9DE" />
        <Rect x={281} y={19} width={90} height={29} rx={4} fill="#E5E9DE" />
        <Rect x={16} y={155} width={62} height={28} rx={4} fill="#E5E9DE" />
        <Rect x={120} y={153} width={120} height={34} rx={4} fill="#E5E9DE" />
        <Rect x={278} y={157} width={94} height={31} rx={4} fill="#E5E9DE" />
        <Path d="M57 170 C 90 166, 100 124, 140 118 S 220 104, 263 85" stroke={LIME} strokeWidth={5} fill="none" strokeLinecap="round" />
        <Path d="M263 85 C 290 76, 308 62, 328 44" stroke="#B9C6AC" strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray="8 7" />
        <Circle cx={57} cy={170} r={6} fill={C.greenDeep} />
        <Circle cx={263} cy={85} r={16} fill={LIME} fillOpacity={0.3} />
        <Circle cx={263} cy={85} r={9.5} fill="#fff" stroke={C.greenDeep} strokeWidth={3} />
        <Circle cx={328} cy={44} r={7} fill="#fff" stroke={C.greenDeep} strokeWidth={3} />
      </Svg>
      <View style={styles.mapPill}>
        <View style={styles.mapDot} />
        <Txt numberOfLines={1} style={[f(600, 12, 1.2), { color: C.greenDeep }]}>Marcus is 1.8 km away</Txt>
      </View>
      <Txt numberOfLines={1} style={[f(500, 10, 1.2), styles.mapRoute]}>Collingwood → 123 Collins Street</Txt>
      <View style={styles.zoomStack}>
        <View style={styles.zoom}>
          <Txt style={[f(600, 15, 1.2), { color: C.ink }]}>+</Txt>
        </View>
        <View style={styles.zoom}>
          <Txt style={[f(600, 15, 1.2), { color: C.ink }]}>−</Txt>
        </View>
      </View>
    </View>
  );
}

export default function TrackScreen() {
  const pad = usePad();
  const order = useApp((s) => s.order);
  const slot = useApp((s) => s.slot);
  const schDay = useApp((s) => s.schDay);

  return (
    <Screen style={{ backgroundColor: '#fff' }}>
      <View style={[styles.header, { paddingTop: pad.top(53) }]}>
        <Txt numberOfLines={1} style={f(700, 17, 1.2)}>Track order</Txt>
        <Txt numberOfLines={1} style={[f(400, 12.5, 1.25), { color: C.muted }]}>{order ? order.no : 'Order #SK10482'}</Txt>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <MapCard />

        <View style={styles.eta}>
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Txt style={[f(500, 12, 1.2), { letterSpacing: 0.8, color: 'rgba(255,255,255,0.6)' }]}>ESTIMATED ARRIVAL</Txt>
            <Txt style={[f(700, 17, 1.25), { color: '#fff' }]}>{slot === 'ASAP' || !slot ? 'Express delivery' : slotLabelOf(slot, schDay)}</Txt>
          </View>
          <Txt style={[f(600, 12.5, 1.2), { marginLeft: 'auto', color: LIME }]}>ON TIME</Txt>
        </View>

        <View style={styles.steps}>
          {TRACK_DEFS.map(([label, time], i) => {
            const done = i < ACTIVE;
            const reached = i <= ACTIVE;
            return (
              <View key={label} style={styles.step}>
                <View style={styles.rail}>
                  <View style={styles.dotBox}>
                    {i === ACTIVE && <Pulse />}
                    <View style={[styles.dot, reached ? styles.dotOn : styles.dotOff]}>
                      {done && <Txt style={[f(700, 10, 1.2), { color: C.greenDeep }]}>✓</Txt>}
                    </View>
                  </View>
                  <View style={[styles.line, { backgroundColor: done ? LIME : '#E7EAE8' }]} />
                </View>
                <View style={styles.stepText}>
                  <Txt numberOfLines={1} style={[f(600, 14, 1.25), { color: reached ? C.greenDeep : '#8A9A8E' }]}>{label}</Txt>
                  <Txt numberOfLines={1} style={[f(400, 12.5, 1.25), { color: C.muted2 }]}>{time}</Txt>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.shopper}>
          <View style={styles.avatar}>
            <Txt style={[f(700, 15, 1.2), { color: C.greenOk }]}>MT</Txt>
          </View>
          <View style={{ gap: 3, flexShrink: 1 }}>
            <Txt numberOfLines={1} style={f(600, 14, 1.25)}>Marcus T · your shopper</Txt>
            <Txt numberOfLines={1} style={[f(400, 12.5, 1.25), { color: C.muted }]}>{TRACK_HEAD}</Txt>
          </View>
          <Tap accessibilityLabel="Call shopper" onPress={() => Linking.openURL('tel:1800774235').catch(() => useApp.getState().flash('Calling is not available on this device'))} style={styles.call}>
            <Svg width={16} height={16} viewBox="0 0 18 18" fill="none">
              <Path
                d="M4 3h3l1.4 3.4-2 1.3a9 9 0 004 4l1.3-2L15 11.2V14a1 1 0 01-1.1 1A12 12 0 013 4.1 1 1 0 014 3z"
                stroke={C.greenDeep}
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

const DOT = 19;

const styles = StyleSheet.create({
  header: { marginHorizontal: 17, paddingLeft: 14, paddingBottom: 8, gap: 2, borderBottomWidth: 1, borderBottomColor: C.divider },
  content: { paddingTop: 14, paddingHorizontal: 17, paddingBottom: 120, gap: 10 },

  map: { height: 200, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#E3E7DC', backgroundColor: '#EEF1E9' },
  mapPill: { position: 'absolute', top: 10, left: 11, height: 24, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 10 },
  mapDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: LIME },
  mapRoute: { position: 'absolute', bottom: 10, left: 10, color: '#7A857A' },
  zoomStack: { position: 'absolute', bottom: 11, right: 13, gap: 7 },
  zoom: { width: 28, height: 28, borderWidth: 1, borderColor: '#E3E7DC', borderRadius: 7, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },

  eta: { height: 57, borderRadius: 10, backgroundColor: C.forest, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },

  steps: { backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, paddingTop: 15, paddingHorizontal: 14, paddingBottom: 6 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rail: { alignItems: 'center', flexShrink: 0, alignSelf: 'stretch' },
  dotBox: { width: DOT, height: DOT },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, alignItems: 'center', justifyContent: 'center' },
  dotOn: { backgroundColor: LIME },
  dotOff: { backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#D4D9D6' },
  line: { flex: 1, width: 2 },
  stepText: { gap: 2, paddingBottom: 14, flex: 1, minWidth: 0 },

  shopper: { minHeight: 62, backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  avatar: { width: 39, height: 39, borderRadius: 8, backgroundColor: '#EFF2EA', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  call: { marginLeft: 'auto', width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: C.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
