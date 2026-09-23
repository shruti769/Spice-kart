import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MARQ_B, MARQ_C, Marquee } from '@/components/auth/marquee';
import { BackIcon, ShieldIcon } from '@/components/icons';
import { FocusStatusBar } from '@/components/ui/focus-status-bar';
import { Grad, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { ETA_MINUTES, LOCAL } from '@/data/catalog';
import { goBack } from '@/lib/nav';
import { useApp } from '@/store/app-store';

/** Prototype `finishAuth`: go to the address picker with a fresh history. */
function finishAuth() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/location');
}

function Digit({ v, filled }: { v: string; filled: boolean }) {
  return (
    <View
      style={{
        flex: 1,
        height: 56,
        borderWidth: 1,
        borderColor: filled ? '#C7E88A' : C.border,
        backgroundColor: filled ? C.selectedBg : C.field,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Txt style={[f(700, 21, 1), !filled && { color: C.placeholder }]}>{v}</Txt>
    </View>
  );
}

export default function OtpScreen() {
  const pad = usePad();
  const phone = useApp((s) => s.phone);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FocusStatusBar style="light" />
      <Grad preset="hero" style={{ flexShrink: 0, height: 300, overflow: 'hidden' }}>
        <Marquee
          scale={1.18}
          rows={[
            { keys: MARQ_B, duration: 30 },
            { keys: MARQ_C, duration: 34, reverse: true },
          ]}
        />
        <Grad
          colors={['rgba(8,53,26,0.55)', 'rgba(8,53,26,0.2)', 'rgba(8,53,26,0.94)']}
          locations={[0, 0.4, 1]}
          style={StyleSheet.absoluteFill}
        />
        <Tap
          accessibilityLabel="Back"
          onPress={goBack}
          hitSlop={6}
          style={{
            position: 'absolute',
            top: pad.top(52),
            left: 16,
            width: 34,
            height: 34,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.16)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <BackIcon size={15} color="#fff" />
        </Tap>
        <View style={{ position: 'absolute', bottom: 20, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', gap: 11 }}>
          <Image source={LOCAL.appIcon} accessibilityLabel="Spice Kart" style={{ width: 38, height: 38, borderRadius: 10 }} />
          <View style={{ gap: 4 }}>
            <Txt style={[f(800, 17, 1), { color: '#fff' }]}>SpiceKart</Txt>
            <Txt numberOfLines={1} style={[f(500, 11, 1), { color: C.lime }]}>
              Groceries in {ETA_MINUTES} minutes
            </Txt>
          </View>
        </View>
      </Grad>

      <View
        style={{
          flex: 1,
          backgroundColor: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          marginTop: -18,
          paddingTop: 20,
          paddingHorizontal: 18,
          paddingBottom: pad.bottom(30),
          gap: 16,
        }}>
        <View style={{ gap: 6 }}>
          <Txt style={f(700, 18, 1.3)}>Verify your number</Txt>
          <Txt style={[f(400, 12, 1.5), { color: C.muted }]}>We sent a 4-digit code to {'+61 ' + phone}.</Txt>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Digit v="4" filled />
          <Digit v="1" filled />
          <Digit v="8" filled />
          <Digit v="|" filled={false} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Txt numberOfLines={1} style={[f(400, 11.5, 1), { color: C.muted2 }]}>
            Didn&apos;t get the code?
          </Txt>
          <Txt numberOfLines={1} style={[f(600, 11.5, 1), { color: C.green }]}>
            Resend in 0:24
          </Txt>
        </View>

        <Tap
          onPress={finishAuth}
          pressedStyle={{ backgroundColor: C.forestHover }}
          style={{ height: 50, borderRadius: 11, backgroundColor: C.forest, alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 14px rgba(11,61,31,0.18)' }}>
          <Txt style={[f(700, 14, 1), { color: '#fff' }]}>Verify &amp; continue</Txt>
        </Tap>

        <View style={{ gap: 8, marginTop: 'auto' }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 9,
              paddingVertical: 11,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: '#F7FAF2',
              borderWidth: 1,
              borderColor: '#E4EBD8',
            }}>
            <View style={{ flexShrink: 0 }}>
              <ShieldIcon size={16} />
            </View>
            <Txt style={[f(500, 11, 1.45), { color: '#3F5B43', flexShrink: 1 }]}>
              Your number is only used for order updates and delivery.
            </Txt>
          </View>
          <Txt style={[f(400, 10, 1.6), { color: C.muted3 }]}>
            Standard message rates may apply. Need help? Contact support 24/7 at help@spicekart.com.au
          </Txt>
        </View>
      </View>
    </View>
  );
}
