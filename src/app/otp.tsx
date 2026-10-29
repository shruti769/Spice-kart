import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { AuthHero, SHEET_OVERLAP } from '@/components/auth/auth-hero';
import { FocusStatusBar } from '@/components/ui/focus-status-bar';
import { Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { phoneAuthError, sendPhoneOtp, verifyPhoneOtp, watchVerifiedPhone } from '@/lib/firebase-auth';
import { toInternationalPhone } from '@/lib/phone';
import { completeSignIn as completePhoneLogin } from '@/lib/sign-in';
import { useApp } from '@/store/app-store';

const LENGTH = 6;
const RESEND_SECONDS = 30;

/** Blinking caret shown in the box that receives the next digit. */
function Caret() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withRepeat(withSequence(withTiming(0, { duration: 500, easing: Easing.linear }), withTiming(1, { duration: 500, easing: Easing.linear })), -1));
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value > 0.5 ? 1 : 0 }));
  return <Animated.View style={[styles.caret, style]} />;
}

function Digit({ v, active, error }: { v: string; active: boolean; error: boolean }) {
  const filled = !!v;
  return (
    <View style={[styles.digit, filled ? styles.digitFilled : styles.digitEmpty, active && styles.digitActive, error && styles.digitError]}>
      {filled ? <Txt style={f(700, 20, 1.2)}>{v}</Txt> : active ? <Caret /> : null}
    </View>
  );
}

export default function OtpScreen() {
  const { insets } = usePad();
  const phone = useApp((s) => s.phone);
  const country = useApp((s) => s.phoneCountry);
  const internationalPhone = toInternationalPhone(phone, country);
  const flash = useApp((s) => s.flash);
  const input = useRef<TextInput>(null);
  const busy = useRef(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(true);
  const [error, setError] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    watchVerifiedPhone(internationalPhone, () => {
      if (active) {
        completePhoneLogin(internationalPhone).catch((error) => {
          if (active) flash(phoneAuthError(error));
        });
      }
    }).then((stop) => {
      if (active) unsubscribe = stop;
      else stop();
    }).catch(() => {});
    return () => { active = false; unsubscribe?.(); };
  }, [internationalPhone, flash]);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const onChange = (value: string) => {
    setError(false);
    setCode(value.replace(/\D/g, '').slice(0, LENGTH));
  };

  const verify = async () => {
    if (busy.current) return;
    if (code.length < LENGTH) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      input.current?.focus();
      return;
    }
    busy.current = true;
    setLoading(true);
    try {
      await verifyPhoneOtp(internationalPhone, code);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      input.current?.blur();
      await completePhoneLogin(internationalPhone);
    } catch (error) {
      setError(true);
      flash(phoneAuthError(error));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const resend = async () => {
    if (busy.current || seconds > 0) return;
    busy.current = true;
    setLoading(true);
    try {
      await sendPhoneOtp(internationalPhone);
      setCode('');
      setError(false);
      setSeconds(RESEND_SECONDS);
      flash('New code sent to ' + internationalPhone);
      input.current?.focus();
    } catch (error) {
      flash(phoneAuthError(error));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  const complete = code.length === LENGTH;

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <FocusStatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AuthHero />

        <View style={[styles.sheet, { paddingBottom: Math.max(40, insets.bottom + 24) }]}>
          <View style={styles.heading}>
            <Txt style={f(700, 20, 1.3)}>Verify your number</Txt>
            <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[f(400, 12, 1.5), { color: C.muted }]}>
              We&apos;ve sent a 6-digit code to {internationalPhone}
            </Txt>
          </View>

          <Pressable accessibilityLabel="Verification code" onPress={() => input.current?.focus()} style={styles.digits}>
            {Array.from({ length: LENGTH }, (_, i) => (
              <Digit key={i} v={code[i] ?? ''} active={focused && i === Math.min(code.length, LENGTH - 1) && !code[i]} error={error} />
            ))}
            {/* The real input sits invisibly on top so the keyboard, paste and SMS autofill all work. */}
            <TextInput
              ref={input}
              value={code}
              onChangeText={onChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSubmitEditing={verify}
              autoFocus
              // iOS number pads get a floating "Done" bar (no return key); this keyboard has its own.
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'number-pad'}
              returnKeyType="done"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={LENGTH}
              caretHidden
              style={styles.hiddenInput}
            />
          </Pressable>

          {error && <Txt style={[f(500, 12, 1.3), styles.errorText]}>Enter the 6-digit code we sent you</Txt>}

          <View style={styles.resend}>
            <Txt numberOfLines={1} style={[f(400, 12, 1.2), { color: C.muted }]}>Didn&apos;t get the code?</Txt>
            {seconds > 0 ? (
              <Txt numberOfLines={1} style={[f(700, 12, 1.2), { color: C.green }]}>Resend in 0:{String(seconds).padStart(2, '0')}</Txt>
            ) : (
              <Tap accessibilityRole="button" disabled={loading} onPress={resend} hitSlop={8}>
                <Txt numberOfLines={1} style={[f(700, 12, 1.2), { color: C.green, textDecorationLine: 'underline' }]}>Resend code</Txt>
              </Tap>
            )}
          </View>

          <Tap accessibilityRole="button" disabled={loading} onPress={verify} pressedStyle={{ backgroundColor: C.limeHover }} style={[styles.verify, !complete && styles.verifyIdle]}>
            <Txt style={[f(700, 14, 1.2), { color: '#102A08' }]}>{loading ? 'Please wait…' : 'Verify & Continue'}</Txt>
          </Tap>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08351A' },
  scroll: { flexGrow: 1 },
  sheet: { flex: 1, marginTop: -SHEET_OVERLAP, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 44 },
  heading: { gap: 6, marginBottom: 24 },
  digits: { flexDirection: 'row', gap: 6 },
  digit: { flex: 1, height: 56, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  digitFilled: { borderColor: '#C7E88A', backgroundColor: C.selectedBg },
  digitEmpty: { borderColor: C.border, backgroundColor: C.field },
  digitActive: { borderColor: C.lime },
  digitError: { borderColor: '#E0A89C' },
  caret: { width: 2, height: 22, borderRadius: 1, backgroundColor: C.placeholder },
  hiddenInput: { ...StyleSheet.absoluteFill, opacity: 0.011, color: 'transparent' },
  errorText: { color: C.danger, marginTop: 8 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 24 },
  verify: { height: 52, borderRadius: 12, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', marginTop: 24, boxShadow: '0 7px 14px rgba(107,176,0,0.23)' },
  verifyIdle: { opacity: 0.55 },
});
