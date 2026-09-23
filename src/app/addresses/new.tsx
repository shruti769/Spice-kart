import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';

import { Card, Field, Footer, SearchField, StarIcon, ToggleRow, scrollContent } from '@/components/account-forms/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { useApp, usePref } from '@/store/app-store';

const TAGS = ['Home', 'Work', 'Other'] as const;

/** Mock map with a 26px grid, two roads each way and the drop pin. */
function MapPreview({ onAdjust }: { onAdjust: () => void }) {
  return (
    <View style={{ height: 150, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E3E7DC', backgroundColor: '#EEF1E8' }}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <Pattern id="grid" x={0} y={0} width={26} height={26} patternUnits="userSpaceOnUse">
            <Rect x={0} y={0} width={26} height={1} fill="rgba(11,61,31,0.055)" />
            <Rect x={0} y={0} width={1} height={26} fill="rgba(11,61,31,0.055)" />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#grid)" />
      </Svg>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 374 150">
        <Path d="M-10 54h394M-10 112h394M120 -10v170M262 -10v170" stroke="#DDE3D4" strokeWidth={8} />
        <Path d="M-10 54h394M-10 112h394M120 -10v170M262 -10v170" stroke="#F4F6F0" strokeWidth={4.5} />
        <Circle cx={187} cy={80} r={18} fill={C.lime} fillOpacity={0.22} />
      </Svg>
      <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -15, marginTop: -34 }}>
        <Svg width={30} height={34} viewBox="0 0 30 34" fill="none">
          <Path d="M15 2c6.1 0 11 4.9 11 11 0 7.9-11 19-11 19S4 20.9 4 13C4 6.9 8.9 2 15 2z" fill={C.forest} />
          <Circle cx={15} cy={13} r={4.4} fill={C.lime} />
        </Svg>
      </View>
      <Tap
        onPress={onAdjust}
        accessibilityRole="button"
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          right: 10,
          height: 34,
          borderWidth: 1,
          borderColor: '#DDE3D4',
          borderRadius: 9,
          backgroundColor: 'rgba(255,255,255,0.95)',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Txt style={[f(600, 11.5, 1), { color: C.forest }]}>Move pin to adjust location</Txt>
      </Tap>
    </View>
  );
}

/** Add new address form (prototype `sAddressNew`). */
export default function AddressNewScreen() {
  const flash = useApp((s) => s.flash);
  const addrTag = useApp((s) => s.addrTag);
  const set = useApp((s) => s.set);
  const togglePref = useApp((s) => s.togglePref);
  const defAddr = usePref('defAddr', true);

  const save = () => {
    flash('Address saved');
    goBack();
  };

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Add new address" subtitle="Step 1 of 1" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <MapPreview onAdjust={() => flash('Coming soon')} />
          <SearchField placeholder="Search street, suburb or postcode" />
          <Field label="STREET ADDRESS" defaultValue="240 Collins Street" textContentType="streetAddressLine1" />
          <Field label="APARTMENT / UNIT (OPTIONAL)" defaultValue="Apt 12" textContentType="streetAddressLine2" />
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Field label="SUBURB" defaultValue="Melbourne" style={{ flex: 1.4, minWidth: 0 }} textContentType="addressCity" />
            <Field label="STATE" defaultValue="VIC" autoCapitalize="characters" style={{ flex: 0.8, minWidth: 0 }} />
            <Field label="POSTCODE" defaultValue="3000" keyboardType="number-pad" maxLength={4} style={{ flex: 1, minWidth: 0 }} textContentType="postalCode" />
          </View>
          <Field label="DELIVERY INSTRUCTIONS" defaultValue="Leave at the concierge desk" hint="Helps your shopper find you faster" />
          <View style={{ gap: 8 }}>
            <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.4, color: C.muted2 }]}>
              SAVE AS
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TAGS.map((t) => {
                const on = addrTag === t;
                return (
                  <Tap
                    key={t}
                    onPress={() => set({ addrTag: t })}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    pressedStyle={{ opacity: 0.85 }}
                    style={{
                      flex: 1,
                      height: 40,
                      borderWidth: 1,
                      borderColor: on ? C.lime : C.border,
                      backgroundColor: on ? C.selectedBgAlt : '#fff',
                      borderRadius: 11,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Txt style={f(600, 12.5, 1)}>{t}</Txt>
                  </Tap>
                );
              })}
            </View>
          </View>
          <Card>
            <ToggleRow
              icon={<StarIcon />}
              title="Set as default address"
              sub="Used automatically at checkout"
              value={defAddr}
              onToggle={() => togglePref('defAddr', true)}
            />
          </Card>
        </ScrollView>
        <Footer label="Save address" onPress={save} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
