import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { Footer, LockGlyph, PrimaryButton, SecondaryButton } from '@/components/money/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { useApp } from '@/store/app-store';

type FieldKey = 'first' | 'last' | 'email' | 'mobile' | 'dob';

/** Labelled input styled like the prototype's field (`height:46px; radius:11px`). */
function Field({
  label,
  value,
  onChange,
  focused,
  onFocus,
  error,
  help,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  onFocus: () => void;
  error?: string;
  help?: string;
  keyboardType?: KeyboardTypeOptions;
}) {
  const border = error ? '#E2A79C' : focused ? C.lime : C.border;
  return (
    <Animated.View layout={LinearTransition.duration(180)} style={{ gap: 6 }}>
      <Txt numberOfLines={1} style={[f(600, 10.5, 1), { letterSpacing: 0.4, color: C.muted2 }]}>
        {label}
      </Txt>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          height: 46,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: border,
          borderRadius: 11,
          backgroundColor: focused && !error ? '#F9FDF1' : C.field,
        }}>
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          allowFontScaling={false}
          selectionColor={C.green}
          placeholderTextColor={C.muted2}
          style={[f(500, 13.5, 1), { flex: 1, color: C.ink, padding: 0 }]}
        />
      </View>
      {!!(error || help) && (
        <Animated.View entering={FadeIn.duration(160)}>
          <Txt style={[f(400, 10, 1.35), { color: error ? C.danger : C.muted3 }]}>{error ?? help}</Txt>
        </Animated.View>
      )}
    </Animated.View>
  );
}

/** Edit personal details (prototype `sPersonal`). */
export default function PersonalScreen() {
  const flash = useApp((s) => s.flash);
  const [focus, setFocus] = useState<FieldKey>('last');
  const [v, setV] = useState({
    first: 'Jaiveer',
    last: 'Singh',
    email: 'jaiveer@spicekart.com.au',
    mobile: '+61 412 908 34',
    dob: '14 / 03 / 1994',
  });
  const upd = (k: FieldKey) => (t: string) => setV((s) => ({ ...s, [k]: t }));

  const local = v.mobile.replace(/\D/g, '').replace(/^61/, '');
  const mobileErr = local.length !== 9 ? 'Enter a valid 9-digit Australian mobile number' : undefined;

  const save = () => {
    flash('Changes saved');
    goBack();
  };

  const badge = (
    <View
      style={{
        backgroundColor: '#FBF0DE',
        borderWidth: 1,
        borderColor: '#EEDCB9',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 6,
      }}>
      <Txt numberOfLines={1} style={[f(600, 10, 1), { color: '#8A6100' }]}>
        EDITING
      </Txt>
    </View>
  );

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Personal details" subtitle="Unsaved changes" right={badge} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: 'center', gap: 9, paddingTop: 4, paddingBottom: 2 }}>
            <View
              style={{
                width: 78,
                height: 78,
                borderRadius: 24,
                backgroundColor: C.forest,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Txt style={[f(700, 26, 1), { color: C.lime }]}>JS</Txt>
              <View
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -4,
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: C.lime,
                  borderWidth: 2,
                  borderColor: '#fff',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Svg width={13} height={13} viewBox="0 0 20 20" fill="none">
                  <Path d="M4 15.2l9.1-9.1 2.8 2.8-9.1 9.1H4v-2.8z" stroke={C.forest} strokeWidth={1.6} strokeLinejoin="round" />
                </Svg>
              </View>
            </View>
            <Tap onPress={() => flash('Coming soon')} hitSlop={8} style={{ paddingVertical: 1, paddingHorizontal: 6 }}>
              <Txt numberOfLines={1} style={[f(600, 11.5, 1), { color: C.green }]}>
                Change photo
              </Txt>
            </Tap>
          </View>

          <Field label="FIRST NAME" value={v.first} onChange={upd('first')} focused={focus === 'first'} onFocus={() => setFocus('first')} />
          <Field label="LAST NAME" value={v.last} onChange={upd('last')} focused={focus === 'last'} onFocus={() => setFocus('last')} />
          <Field
            label="EMAIL ADDRESS"
            value={v.email}
            onChange={upd('email')}
            focused={focus === 'email'}
            onFocus={() => setFocus('email')}
            keyboardType="email-address"
          />
          <Field
            label="MOBILE NUMBER"
            value={v.mobile}
            onChange={upd('mobile')}
            focused={focus === 'mobile'}
            onFocus={() => setFocus('mobile')}
            keyboardType="phone-pad"
            error={mobileErr}
          />
          <Field
            label="DATE OF BIRTH (OPTIONAL)"
            value={v.dob}
            onChange={upd('dob')}
            focused={focus === 'dob'}
            onFocus={() => setFocus('dob')}
            keyboardType="numbers-and-punctuation"
            help="Used only to verify age-restricted items"
          />

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
            <LockGlyph size={15} />
            <Txt style={[f(500, 10.5, 1.45), { color: '#3F5B43', flexShrink: 1 }]}>
              Your details are encrypted and never shared with delivery partners beyond your name.
            </Txt>
          </View>
        </ScrollView>
        <Footer>
          <PrimaryButton label="Save changes" onPress={save} />
          <SecondaryButton label="Discard changes" onPress={goBack} />
        </Footer>
      </KeyboardAvoidingView>
    </Screen>
  );
}
