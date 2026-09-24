import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { AuthHero, SHEET_OVERLAP } from '@/components/auth/auth-hero';
import { FocusStatusBar } from '@/components/ui/focus-status-bar';
import { Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

function AppleIcon() {
  return (
    <Svg width={19} height={21} viewBox="0 0 24 24" fill="#000">
      <Path d="M17.05 12.54c.03 3.23 2.83 4.3 2.86 4.31-.02.08-.45 1.54-1.48 3.05-.9 1.3-1.83 2.6-3.3 2.63-1.44.03-1.9-.85-3.55-.85-1.64 0-2.16.82-3.52.88-1.42.05-2.5-1.42-3.4-2.71-1.85-2.67-3.27-7.55-1.37-10.85a5.27 5.27 0 014.46-2.7c1.4-.03 2.72.94 3.57.94.84 0 2.43-1.17 4.1-1 .7.03 2.67.28 3.94 2.14-.1.06-2.35 1.37-2.31 4.16zM14.34 4.44c.75-.91 1.26-2.18 1.12-3.44-1.08.04-2.39.72-3.17 1.63-.69.79-1.3 2.05-1.14 3.26 1.21.09 2.44-.62 3.19-1.45z" />
    </Svg>
  );
}

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 01-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36z" />
      <Path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.89.6-2.03.96-3.39.96-2.61 0-4.83-1.76-5.62-4.12H3.04v2.59A10 10 0 0012 22z" />
      <Path fill="#FBBC05" d="M6.38 13.92a6 6 0 010-3.84V7.49H3.04a10 10 0 000 9.02l3.34-2.59z" />
      <Path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.62 9.62 0 0012 2a10 10 0 00-8.96 5.49l3.34 2.59A5.99 5.99 0 0112 5.96z" />
    </Svg>
  );
}

/**
 * Demo sign-in: any 9-digit number after +61 is accepted. Real verification (e.g. the
 * Australian "starts with 4" rule and the SMS check) belongs to the backend integration.
 */
const isValidMobile = (digits: string) => /^\d{9}$/.test(digits);

/** iOS number/phone pads have no return key, so iOS adds a floating "Done" bar; this keyboard has its own return key. */
const NUMBER_KEYBOARD = Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'phone-pad';

/** Keep digits only, drop a leading 0 ("0412…" → "412…") and cap at 9 digits. */
const cleanMobile = (value: string) => value.replace(/\D/g, '').replace(/^0/, '').slice(0, 9);

/** "412908344" → "412 908 344". */
const formatMobile = (digits: string) => digits.replace(/(\d{3})(?=\d)/g, '$1 ');

/** Social sign-in skips the SMS step and goes straight to the address picker. */
function socialSignIn(provider: string) {
  useApp.getState().flash('Signed in with ' + provider);
  if (router.canDismiss()) router.dismissAll();
  router.replace('/location');
}

// Use vector artwork so the flag never depends on the text font's emoji support.
function AustraliaFlag() {
  return (
    <Svg width={21} height={15} viewBox="0 0 42 30">
      <Rect width={42} height={30} rx={3} fill="#183C8E" />
      <Path d="M1 1l19 13m0-13L1 14" stroke="#fff" strokeWidth={4} />
      <Path d="M1 1l19 13m0-13L1 14" stroke="#E63B44" strokeWidth={1.5} />
      <Path d="M10 0v16M0 8h22" stroke="#fff" strokeWidth={6} />
      <Path d="M10 0v16M0 8h22" stroke="#E63B44" strokeWidth={3} />
      <Path fill="#fff" d="m10 19 1 3 3-.5-2 2 1 3-3-1.5L7 27l1-3-2-2 3 .5zM31 4l.8 2.3H34l-1.8 1.4.7 2.3L31 8.6 29.1 10l.7-2.3L28 6.3h2.2zM26 13l.7 2h2l-1.6 1.2.6 2-1.7-1.2-1.7 1.2.6-2-1.6-1.2h2zM36 11l.7 2h2l-1.6 1.2.6 2-1.7-1.2-1.7 1.2.6-2-1.6-1.2h2zM31 22l.7 2h2l-1.6 1.2.6 2-1.7-1.2-1.7 1.2.6-2-1.6-1.2h2z" />
    </Svg>
  );
}

export default function LoginScreen() {
  const { insets } = usePad();
  const phone = useApp((s) => s.phone);
  const set = useApp((s) => s.set);
  const flash = useApp((s) => s.flash);
  const [error, setError] = useState(false);
  const digits = cleanMobile(phone);

  const goOtp = () => {
    if (!isValidMobile(digits)) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    set({ phone: digits });
    router.push('/otp');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <FocusStatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <AuthHero />

        <View style={[styles.sheet, { paddingBottom: Math.max(40, insets.bottom + 24) }]}>
          <View style={styles.heading}>
            <Txt style={f(700, 20, 1.3)}>Log in or sign up</Txt>
            <Txt numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[f(400, 12, 1.5), styles.subtitle]}>Enter your mobile number - we&apos;ll text you a one-time code.</Txt>
          </View>

          <View style={[styles.phoneField, error && styles.phoneFieldError]}>
            <Tap accessibilityRole="button" accessibilityLabel="Country: Australia, plus 61" onPress={() => flash('Currently available for Australian mobile numbers (+61).')} style={styles.country}>
              <AustraliaFlag />
              <Svg width={8} height={5} viewBox="0 0 8 5"><Path d="M0 0h8L4 5z" fill="#111" /></Svg>
            </Tap>
            <View style={styles.fieldDivider} />
            <Txt style={f(600, 14, 1.2)}>+61</Txt>
            <TextInput
              value={formatMobile(digits)}
              onChangeText={(value) => {
                setError(false);
                set({ phone: cleanMobile(value) });
              }}
              maxLength={11}
              placeholder="Enter mobile number"
              accessibilityLabel="Mobile number"
              placeholderTextColor={C.muted}
              keyboardType={NUMBER_KEYBOARD}
              textContentType="telephoneNumber"
              autoComplete="tel"
              returnKeyType="done"
              onSubmitEditing={goOtp}
              underlineColorAndroid="transparent"
              selectionColor={C.green}
              style={[f(600, 14, 1.2), styles.input]}
            />
          </View>

          {error && <Txt style={[f(500, 12, 1.3), styles.error]}>Enter a 9-digit mobile number</Txt>}

          <Tap accessibilityRole="button" onPress={goOtp} pressedStyle={{ backgroundColor: C.limeHover }} style={[styles.continue, !isValidMobile(digits) && styles.continueIdle]}>
            <Txt style={[f(700, 14, 1.2), { color: '#102A08' }]}>Continue</Txt>
          </Tap>

          <View style={styles.separator}>
            <View style={styles.line} />
            <Txt style={[f(500, 12, 1.2), { color: C.muted3 }]}>OR</Txt>
            <View style={styles.line} />
          </View>

          <View style={styles.socialRow}>
            <Tap accessibilityRole="button" accessibilityLabel="Continue with Apple" onPress={() => socialSignIn('Apple')} style={styles.social}>
              <AppleIcon /><Txt style={f(600, 13, 1.2)}>Apple</Txt>
            </Tap>
            <Tap accessibilityRole="button" accessibilityLabel="Continue with Google" onPress={() => socialSignIn('Google')} style={styles.social}>
              <GoogleIcon /><Txt style={f(600, 13, 1.2)}>Google</Txt>
            </Tap>
          </View>

          <Txt style={[f(400, 8, 1.7), styles.legal]}>
            By continuing, you agree to Spice Kart&apos;s{' '}
            <Txt accessibilityRole="link" onPress={() => router.push('/terms')} style={styles.legal}>Terms of Service</Txt>
            {' & '}
            <Txt accessibilityRole="link" onPress={() => router.push('/policy')} style={styles.legal}>Privacy Policy.</Txt>
          </Txt>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08351A' },
  scroll: { flexGrow: 1 },
  sheet: { flex: 1, marginTop: -SHEET_OVERLAP, borderTopLeftRadius: 18, borderTopRightRadius: 18, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 44 },
  heading: { gap: 6, paddingHorizontal: 6, marginBottom: 24 },
  subtitle: { color: C.muted },
  phoneField: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 54, paddingHorizontal: 16, backgroundColor: C.field, borderWidth: 1, borderColor: C.border, borderRadius: 13 },
  country: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 48 },
  fieldDivider: { width: 1, height: 20, backgroundColor: C.border, marginHorizontal: 3 },
  input: { flex: 1, minWidth: 0, height: 52, padding: 0, lineHeight: undefined, color: C.ink },
  phoneFieldError: { borderColor: '#E0A89C', backgroundColor: '#FFFBFA' },
  error: { color: C.danger, marginTop: 8, paddingHorizontal: 4 },
  continueIdle: { opacity: 0.55 },
  continue: { height: 52, borderRadius: 12, backgroundColor: C.lime, alignItems: 'center', justifyContent: 'center', marginTop: 22, boxShadow: '0 7px 14px rgba(107,176,0,0.23)' },
  separator: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: C.divider },
  socialRow: { flexDirection: 'row', gap: 10 },
  social: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: C.border, borderRadius: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff' },
  legal: { color: C.muted3, textAlign: 'center', marginTop: 26 },
});
