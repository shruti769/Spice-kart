import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PinIcon, SearchIcon } from '@/components/icons';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { addressAt, explainNoFix, getDeviceFix } from '@/lib/location';
import { useApp } from '@/store/app-store';

/** Prototype `useLoc`: return to where we came from, or land on Home after sign-in. */
function done() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

function PlusIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2v14M2 9h14" stroke={C.greenOk} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

const addNew = () => router.push({ pathname: '/addresses/new', params: { from: 'location' } });

export default function LocationScreen() {
  const pad = usePad();
  const [locating, setLocating] = useState(false);

  /** GPS fix → street address → the Add address form, prefilled for the user to check. */
  const useMyLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const r = await getDeviceFix({ ask: true });
      if (!r.ok) return explainNoFix(r);
      const found = await addressAt(r.fix);
      if (!found) useApp.getState().flash('Couldn’t read the address here · please fill it in');
      router.push({
        pathname: '/addresses/new',
        params: { from: 'location', lat: String(r.fix.lat), lng: String(r.fix.lng), ...(found ?? {}) },
      });
    } finally {
      setLocating(false);
    }
  };

  return (
    <Screen>
      <Grad preset="header" style={[styles.header, { paddingTop: pad.top(78) }]}>
        <Txt numberOfLines={1} style={[f(700, 18, 1.3), { color: C.greenDeep }]}>Addresses</Txt>
        <Tap accessibilityRole="button" onPress={done} hitSlop={8} style={styles.skip}>
          <Txt style={[f(600, 13, 1.2), { color: C.greenMuted }]}>Skip</Txt>
        </Tap>
      </Grad>

      <ScrollView style={styles.body} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Tap accessibilityRole="search" onPress={addNew} style={styles.search}>
          <SearchIcon size={18} />
          <Txt numberOfLines={1} style={[f(400, 14, 1.2), { color: C.muted2 }]}>Search suburb or postcode</Txt>
        </Tap>

        <Tap accessibilityRole="button" onPress={useMyLocation} pressedStyle={{ backgroundColor: C.selectedBg }} style={[styles.card, styles.current]}>
          <PinIcon size={20} color={C.greenOk} />
          <View style={styles.cardText}>
            <Txt numberOfLines={1} style={[f(600, 14, 1.3), { color: C.greenOk }]}>Use my current location</Txt>
            <Txt numberOfLines={1} style={[f(400, 12, 1.3), { color: C.muted }]}>
              {locating ? 'Finding your location…' : 'Enable location for faster delivery'}
            </Txt>
          </View>
        </Tap>

        <Tap accessibilityRole="button" onPress={addNew} pressedStyle={{ backgroundColor: C.selectedBg }} style={[styles.card, styles.add]}>
          <PlusIcon />
          <Txt numberOfLines={1} style={[f(600, 14, 1.3), { color: C.greenOk }]}>Add new address</Txt>
        </Tap>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 18,
    paddingRight: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE8CD',
  },
  skip: { paddingVertical: 4, paddingHorizontal: 16 },
  body: { flex: 1, backgroundColor: C.bg },
  content: { padding: 18, gap: 16 },
  search: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 10,
  },
  card: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, backgroundColor: '#fff', borderWidth: 1, borderRadius: 10 },
  current: { borderColor: '#A6DA5A' },
  add: { borderColor: '#A6DA5A', borderStyle: 'dashed' },
  cardText: { flexShrink: 1, gap: 2 },
});
