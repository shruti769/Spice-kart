import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { DialogButtons } from '@/components/account-forms/parts';
import { PinIcon, SearchIcon } from '@/components/icons';
import { BottomSheet } from '@/components/overlays';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';


function PlusIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 18 18" fill="none">
      <Path d="M9 2v14M2 9h14" stroke={C.greenOk} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** 1px lime dashed outline (RN's `borderStyle: 'dashed'` can't set the dash length). */
function DashedBorder() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {size.w > 0 && (
        <Svg width={size.w} height={size.h}>
          <Rect x={0.5} y={0.5} width={size.w - 1} height={size.h - 1} rx={10.5} stroke="#B3E25B" strokeWidth={1} strokeDasharray="4.5 5" fill="none" />
        </Svg>
      )}
    </View>
  );
}

/** Saved addresses (design 51). */
export default function AddressesScreen() {
  const pad = usePad();
  const flash = useApp((s) => s.flash);
  const addresses = useApp((s) => s.addresses);
  const selected = useApp((s) => s.addr);
  const [removing, setRemoving] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const close = () => setRemoving(null);

  // Design order: Work first, then the rest in saved order. Indexes point into the store list.
  const q = query.trim().toLowerCase();
  const saved = addresses
    .map((a, index) => ({ a, index }))
    .sort((x, y) => (x.a.tag === 'W' ? -1 : y.a.tag === 'W' ? 1 : 0))
    .filter(({ a }) => !q || (a.label + ' ' + a.line).toLowerCase().includes(q));

  const select = (index: number) => {
    useApp.getState().set({ addr: index });
    flash('Delivering to ' + addresses[index].label);
  };
  const useCurrent = () => {
    const home = addresses.findIndex((a) => a.tag === 'H');
    useApp.getState().set({ addr: Math.max(0, home) });
    flash('Location found · delivering to ' + addresses[Math.max(0, home)].label);
  };
  const confirmRemove = () => {
    if (removing === null) return;
    if (addresses.length <= 1) flash('Keep at least one address');
    else {
      useApp.getState().removeAddress(removing);
      flash('Address removed');
    }
    close();
  };

  return (
    <Screen>
      <Grad preset="header" style={[styles.header, { paddingTop: pad.top(80) }]}>
        <Txt numberOfLines={1} style={[f(700, 15.5, 1.2), { color: C.forest }]}>
          Saved Addresses
        </Txt>
      </Grad>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.search}>
          <SearchIcon size={17} />
          <TextInput
            allowFontScaling={false}
            placeholder="Search suburb or postcode"
            placeholderTextColor={C.muted2}
            selectionColor={C.green}
            returnKeyType="search"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>

        <Tap accessibilityRole="button" onPress={useCurrent} pressedStyle={{ backgroundColor: C.selectedBg }} style={[styles.card, styles.current]}>
          <PinIcon size={19} color={C.greenOk} />
          <View style={styles.cardText}>
            <Txt numberOfLines={1} style={[f(600, 14, 1.3), { color: C.greenOk }]}>
              Use my current location
            </Txt>
            <Txt numberOfLines={1} style={[f(400, 12, 1.3), { color: C.muted }]}>
              Enable location for faster delivery
            </Txt>
          </View>
        </Tap>

        <Tap accessibilityRole="button" onPress={() => router.push('/addresses/new')} pressedStyle={{ backgroundColor: C.selectedBg }} style={[styles.card, styles.add]}>
          <DashedBorder />
          <PlusIcon />
          <Txt numberOfLines={1} style={[f(600, 14, 1.3), { color: C.greenOk }]}>
            Add new address
          </Txt>
        </Tap>

        <Txt numberOfLines={1} style={styles.label}>
          SAVED ADDRESSES
        </Txt>

        {saved.length === 0 && <Txt style={[f(400, 12, 1.4), { color: C.muted }]}>No saved address matches “{query}”.</Txt>}
        {saved.map(({ a, index }, i) => (
          <Tap
            key={index + a.line}
            accessibilityRole="button"
            accessibilityHint="Long press to remove"
            accessibilityState={{ selected: index === selected }}
            onPress={() => select(index)}
            onLongPress={() => setRemoving(index)}
            pressedStyle={{ backgroundColor: '#EFF0EC' }}
            style={[styles.address, index === selected && styles.addressOn, i > 0 && { marginTop: 11 }]}>
            <View style={styles.tag}>
              <Txt style={[f(700, 11, 1), { color: C.greenOk }]}>{a.tag}</Txt>
            </View>
            <View style={styles.addressText}>
              <Txt numberOfLines={1} style={[f(700, 13, 1.2), { color: '#000' }]}>
                {a.label}
              </Txt>
              <Txt numberOfLines={2} style={[f(400, 12, 1.35), { color: C.muted }]}>
                {a.line}
              </Txt>
            </View>
          </Tap>
        ))}
      </ScrollView>

      <BottomSheet
        visible={!!removing}
        onClose={close}
        dim={0.4}
        style={{
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingTop: 18,
          paddingHorizontal: 16,
          paddingBottom: pad.bottom(32),
          gap: 11,
        }}>
        <Txt style={f(700, 15, 1.3)}>Remove this address?</Txt>
        <Txt style={[f(400, 12, 1.6), { color: C.muted }]}>{removing !== null ? addresses[removing]?.line : ''} will no longer appear at checkout.</Txt>
        <DialogButtons cancel="Cancel" confirm="Remove" onCancel={close} onConfirm={confirmRemove} height={46} size={13} />
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexShrink: 0,
    paddingLeft: 25,
    paddingRight: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE8CD',
  },
  content: { paddingTop: 16.5, paddingHorizontal: 24, paddingBottom: 24 },
  search: {
    height: 41,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 10.5,
  },
  searchInput: { flex: 1, minWidth: 0, padding: 0, fontFamily: 'Inter_400Regular', fontSize: 13, color: C.ink },
  card: { height: 62.5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12.5, backgroundColor: '#fff', borderRadius: 11 },
  current: { marginTop: 13.5, borderWidth: 1, borderColor: C.lime },
  add: { marginTop: 14 },
  cardText: { flexShrink: 1, gap: 1 },
  label: { ...f(600, 10.5, 1), marginTop: 16.5, marginBottom: 23, letterSpacing: 0.8, color: C.muted2 },
  address: {
    minHeight: 65.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 12,
  },
  addressOn: { borderColor: C.lime, backgroundColor: C.selectedBg },
  tag: { width: 27, height: 27, borderRadius: 5, backgroundColor: '#F2F5ED', alignItems: 'center', justifyContent: 'center' },
  addressText: { flex: 1, minWidth: 0, gap: 4 },
});
