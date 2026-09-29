import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { BackIcon, SearchIcon } from '@/components/icons';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { coordsOf } from '@/lib/location';
import { goBack } from '@/lib/nav';
import { deliversTo } from '@/lib/remote-postcodes';
import { useApp, usePref } from '@/store/app-store';

const TAGS = ['Home', 'Work', 'Other'] as const;
const MAP = require('@/assets/images/addresses/map.png');

/** Single-line input font without a line-height (keeps the text vertically centred on iOS). */
const inputFont = (w: 400 | 500, size: number) => {
  const { lineHeight: _lh, ...rest } = f(w, size, 1);
  return rest;
};

const StarIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
    <Path d="M10 3.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 14l-4.2 2.2.8-4.7L3.2 8.2l4.7-.7L10 3.2z" stroke={C.ink2} strokeWidth={1.4} strokeLinejoin="round" />
  </Svg>
);

/** Map snapshot (Chadstone) with the drop pin baked in, plus the adjust pill. */
function MapPreview({ onAdjust }: { onAdjust: () => void }) {
  return (
    <View style={styles.map}>
      <Image source={MAP} contentFit="cover" style={styles.mapImage} />
      <Tap onPress={onAdjust} accessibilityRole="button" pressedStyle={{ backgroundColor: '#F4F6F0' }} style={styles.mapPill}>
        <Txt style={[f(600, 11.5, 1), { color: C.forest }]}>Move pin to adjust location</Txt>
      </Tap>
    </View>
  );
}

function Label({ children }: { children: string }) {
  return (
    <Txt numberOfLines={1} style={styles.label}>
      {children}
    </Txt>
  );
}

function Field({ label, style, ...input }: TextInputProps & { label: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 8 }, style]}>
      <Label>{label}</Label>
      <View style={styles.field}>
        <TextInput
          allowFontScaling={false}
          placeholderTextColor={C.muted2}
          selectionColor={C.green}
          {...input}
          style={[inputFont(500, 13.5), styles.input]}
        />
      </View>
    </View>
  );
}

/** 41×25 lime switch, knob slides 3px ↔ 19px. */
function Toggle({ value, onChange, label }: { value: boolean; onChange: () => void; label: string }) {
  const v = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    v.set(withTiming(value ? 1 : 0, { duration: 180 }));
  }, [value, v]);

  const track = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(v.get(), [0, 1], [C.toggleOff, C.lime]) }));
  const knob = useAnimatedStyle(() => ({ left: 3 + v.get() * 16 }));

  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} accessibilityLabel={label} onPress={onChange} hitSlop={6}>
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

/** Add new address form (design 52). */
export default function AddressNewScreen() {
  const pad = usePad();
  const flash = useApp((s) => s.flash);
  const addrTag = useApp((s) => s.addrTag);
  const set = useApp((s) => s.set);
  const togglePref = useApp((s) => s.togglePref);
  const defAddr = usePref('defAddr', true);

  // From "Use my current location": the GPS pin and the address found there.
  const p = useLocalSearchParams<{ from?: string; lat?: string; lng?: string; street?: string; suburb?: string; state?: string; postcode?: string }>();
  const { from } = p;
  const located = p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : null;
  const [initial] = useState(() =>
    located
      ? { street: p.street ?? '', unit: '', suburb: p.suburb ?? '', state: p.state || 'VIC', postcode: p.postcode ?? '', notes: '' }
      : {
          street: '240 Lincoln Street',
          unit: 'Apt 12',
          suburb: 'Melbourne',
          state: 'VIC',
          postcode: '3000',
          notes: 'Leave at the concierge desk',
        },
  );
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const edit = (key: keyof typeof form) => (value: string) => {
    setError('');
    setForm((f) => ({ ...f, [key]: value }));
  };

  const save = async () => {
    if (saving) return;
    const street = form.street.trim();
    const suburb = form.suburb.trim();
    const state = form.state.trim().toUpperCase();
    const postcode = form.postcode.trim();
    if (!street || !suburb || !state) return setError('Please fill in street, suburb and state');
    if (!/^\d{4}$/.test(postcode)) return setError('Enter a valid 4-digit postcode');
    if (!deliversTo(postcode)) return setError(`Sorry, we don’t deliver to ${postcode} yet`);

    const unit = form.unit.trim();
    const area = suburb + ' ' + state;
    const line = (unit ? unit + ', ' : '') + street + ', ' + area + ' ' + postcode;
    // Keep the GPS pin unless the address was changed to somewhere else; otherwise look it up.
    const moved = street !== initial.street.trim() || suburb !== initial.suburb.trim() || postcode !== initial.postcode.trim();
    setSaving(true);
    const pin = located && !moved ? located : await coordsOf(street + ', ' + area + ' ' + postcode + ', Australia');
    setSaving(false);
    useApp.getState().addAddress({ tag: addrTag[0], label: addrTag, line, area, ...(pin ?? {}) }, defAddr);
    flash(defAddr ? 'Address saved · set as default' : 'Address saved');
    // During onboarding (opened from the address picker) finish straight into the app.
    if (from === 'location') {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/home');
    } else goBack();
  };

  return (
    <Screen>
      <Grad preset="header" style={[styles.header, { paddingTop: pad.top(54) }]}>
        <Tap accessibilityLabel="Back" onPress={goBack} hitSlop={8} style={styles.back}>
          <BackIcon color={C.forest} />
        </Tap>
        <View style={{ gap: 4.5, flexShrink: 1 }}>
          <Txt numberOfLines={1} style={[f(700, 15.5, 1.2), { color: C.forest }]}>
            Add new address
          </Txt>
          <Txt numberOfLines={1} style={[f(400, 11, 1), { color: C.greenMuted }]}>
            Step 1 of 1
          </Txt>
        </View>
      </Grad>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <MapPreview onAdjust={() => flash('Pin placed at ' + (form.street.trim() || 'your address'))} />

          <View style={styles.search}>
            <SearchIcon size={15} />
            <TextInput
              allowFontScaling={false}
              placeholder="Search street, suburb or postcode"
              placeholderTextColor="#A8A8A2"
              selectionColor={C.green}
              returnKeyType="search"
              style={[inputFont(400, 13), styles.input]}
            />
          </View>

          <Field label="STREET ADDRESS" value={form.street} onChangeText={edit('street')} placeholder="Street address" textContentType="streetAddressLine1" />
          <Field label="APARTMENT / UNIT (OPTIONAL)" value={form.unit} onChangeText={edit('unit')} placeholder="Apartment, unit or floor" textContentType="streetAddressLine2" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field label="SUBURB" value={form.suburb} onChangeText={edit('suburb')} style={{ flex: 159.6, minWidth: 0 }} textContentType="addressCity" />
            <Field label="STATE" value={form.state} onChangeText={edit('state')} maxLength={3} autoCapitalize="characters" style={{ flex: 91, minWidth: 0 }} />
            <Field label="POSTCODE" value={form.postcode} onChangeText={edit('postcode')} keyboardType="number-pad" maxLength={4} style={{ flex: 113.4, minWidth: 0 }} textContentType="postalCode" />
          </View>
          <View style={{ gap: 5 }}>
            <Field label="DELIVERY INSTRUCTIONS" value={form.notes} onChangeText={edit('notes')} placeholder="E.g. leave at the door" />
            <Txt style={[f(400, 10, 1.35), { color: C.muted3 }]}>Helps your shopper find you faster</Txt>
          </View>

          <View style={{ gap: 9, marginTop: 3 }}>
            <Label>SAVE AS</Label>
            <View style={{ flexDirection: 'row', gap: 9 }}>
              {TAGS.map((t) => {
                const on = addrTag === t;
                return (
                  <Tap
                    key={t}
                    onPress={() => set({ addrTag: t })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    pressedStyle={{ opacity: 0.85 }}
                    style={[styles.pill, on && styles.pillOn]}>
                    <Txt style={f(600, 12.5, 1)}>{t}</Txt>
                  </Tap>
                );
              })}
            </View>
          </View>

          <View style={styles.defCard}>
            <View style={styles.starBox}>
              <StarIcon />
            </View>
            <View style={{ gap: 3.5, flex: 1, minWidth: 0 }}>
              <Txt numberOfLines={1} style={f(500, 13, 1.2)}>
                Set as default address
              </Txt>
              <Txt style={[f(400, 10.5, 1.35), { color: C.muted2 }]}>Used automatically at checkout</Txt>
            </View>
            <Toggle value={defAddr} onChange={() => togglePref('defAddr', true)} label="Toggle Set as default address" />
          </View>
          {!!error && <Txt style={[f(500, 12, 1.3), { color: C.danger }]}>{error}</Txt>}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: pad.bottom(30) }]}>
          <Tap onPress={save} accessibilityRole="button" pressedStyle={{ backgroundColor: C.limeHover }} style={styles.saveBtn}>
            <Txt style={[f(700, 14, 1), { color: C.forest }]}>{saving ? 'Saving…' : 'Save address'}</Txt>
          </Tap>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 14,
    paddingBottom: 12.5,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE8CD',
  },
  back: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 18, gap: 10.5 },
  map: { marginBottom: 1.5, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E3E7DC', backgroundColor: '#F6F4F4' },
  mapImage: { width: '100%', aspectRatio: 512 / 191 },
  mapPill: {
    position: 'absolute',
    left: 11,
    right: 11,
    bottom: 10,
    height: 34.5,
    borderWidth: 1,
    borderColor: '#E4E7DC',
    borderRadius: 8,
    backgroundColor: '#FEFEFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    marginBottom: 1.5,
    height: 45.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10.5,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.borderSoft,
    borderRadius: 11,
  },
  input: { flex: 1, minWidth: 0, padding: 0, color: C.ink },
  label: { ...f(600, 10.5, 1), letterSpacing: 0.55, color: C.muted2 },
  field: {
    height: 49,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12.5,
    backgroundColor: C.field,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 11,
  },
  pill: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillOn: { borderColor: C.lime, backgroundColor: C.selectedBgAlt },
  defCard: {
    marginTop: 2,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 12.5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.borderCard,
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(16,24,16,0.045)',
  },
  starBox: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderColor: '#D9D9D4',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  track: { width: 41, height: 25, borderRadius: 12.5 },
  knob: { position: 'absolute', top: 3, width: 19, height: 19, borderRadius: 9.5, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
  footer: {
    flexShrink: 0,
    paddingTop: 10,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: C.divider,
    boxShadow: '0 -6px 18px rgba(16,24,16,0.05)',
  },
  saveBtn: { height: 48, borderRadius: 12, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center' },
});
