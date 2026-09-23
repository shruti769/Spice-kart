import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { PinIcon, SearchIcon } from '@/components/icons';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { ADDRESSES, LOCAL } from '@/data/catalog';
import { useApp } from '@/store/app-store';

/** Prototype `useLoc`: return to where we came from, or land on Home after sign-in. */
function done() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

export default function LocationScreen() {
  const pad = usePad();
  const set = useApp((s) => s.set);

  return (
    <Screen>
      <Grad
        preset="header"
        style={{
          flexShrink: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#DFE8CD',
          paddingTop: pad.top(56),
          paddingHorizontal: 16,
          paddingBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
        <Image source={LOCAL.appIcon} style={{ width: 30, height: 30, borderRadius: 8 }} />
        <Txt numberOfLines={1} style={[f(700, 15, 1.2), { color: C.forest }]}>
          Set your delivery address
        </Txt>
      </Grad>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: C.borderSoft,
            borderRadius: 10,
            paddingVertical: 11,
            paddingHorizontal: 12,
          }}>
          <SearchIcon size={16} />
          <Txt style={[f(400, 13, 1), { color: C.muted2 }]}>Search suburb or postcode</Txt>
        </View>

        <Tap
          onPress={done}
          pressedStyle={{ backgroundColor: '#FAFBF7' }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: C.borderSoft,
            borderLeftWidth: 3,
            borderLeftColor: C.lime,
            borderRadius: 10,
            paddingVertical: 13,
            paddingHorizontal: 12,
          }}>
          <PinIcon size={18} />
          <View style={{ gap: 2, flexShrink: 1 }}>
            <Txt numberOfLines={1} style={[f(600, 13.5, 1.2), { color: C.green }]}>
              Use my current location
            </Txt>
            <Txt numberOfLines={1} style={[f(400, 11.5, 1.2), { color: C.muted }]}>
              Enable location for faster delivery
            </Txt>
          </View>
        </Tap>

        <Txt style={[f(600, 11, 1), { letterSpacing: 0.5, color: C.muted2, paddingTop: 2 }]}>SAVED ADDRESSES</Txt>

        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderSoft, borderRadius: 10, overflow: 'hidden' }}>
          {ADDRESSES.map((a, i) => (
            <Tap
              key={a.tag}
              onPress={() => {
                set({ addr: i });
                done();
              }}
              pressedStyle={{ backgroundColor: '#FAFBF7' }}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 11,
                borderBottomWidth: 1,
                borderBottomColor: C.dividerSoft,
                paddingVertical: 13,
                paddingHorizontal: 12,
              }}>
              <View style={{ width: 26, height: 26, borderRadius: 6, backgroundColor: '#F1F5EC', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Txt style={[f(700, 11, 1), { color: C.green }]}>{a.tag}</Txt>
              </View>
              <View style={{ gap: 3, flexShrink: 1 }}>
                <Txt style={f(600, 13, 1.2)}>{a.label}</Txt>
                <Txt style={[f(400, 12, 1.4), { color: C.muted }]}>{a.line}</Txt>
              </View>
            </Tap>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexShrink: 0, paddingTop: 10, paddingHorizontal: 16, paddingBottom: pad.bottom(30), backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: C.divider }}>
        <Tap
          onPress={done}
          pressedStyle={{ backgroundColor: C.forestHover }}
          style={{ height: 46, borderRadius: 11, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(11,61,31,0.18)' }}>
          <Txt style={[f(700, 14, 1), { color: '#fff' }]}>Confirm address</Txt>
        </Tap>
      </View>
    </Screen>
  );
}
