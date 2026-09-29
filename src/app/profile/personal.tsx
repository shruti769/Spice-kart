import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { BackIcon } from '@/components/icons';
import { BottomSheet } from '@/components/overlays';
import { Grad, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { pickPhoto } from '@/lib/pick-photo';
import { saveProfile } from '@/lib/remote-profile';
import { useApp } from '@/store/app-store';

type FieldKey = 'first' | 'last' | 'email' | 'mobile' | 'dob';

const FOREST = C.forest;
const LIME = C.lime;
const LINK = C.green;

/** Single-line input font without a line-height (keeps the text vertically centred on iOS). */
const { lineHeight: _lh, ...inputFont } = f(500, 13.5, 1);

/** Labelled 46px input; lime when focused, red-bordered when invalid. */
function Field({
  label,
  value,
  onChange,
  focused,
  onFocus,
  error,
  help,
  keyboardType,
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  focused: boolean;
  onFocus: () => void;
  error?: string;
  help?: string;
  keyboardType?: KeyboardTypeOptions;
  placeholder?: string;
  maxLength?: number;
}) {
  const active = focused && !error;
  return (
    <Animated.View layout={LinearTransition.duration(180)} style={styles.field}>
      <Txt numberOfLines={1} style={styles.label}>
        {label}
      </Txt>
      <View style={[styles.box, error ? styles.boxError : active && styles.boxActive]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          onFocus={onFocus}
          keyboardType={keyboardType}
          placeholder={placeholder}
          maxLength={maxLength}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          allowFontScaling={false}
          selectionColor={C.green}
          placeholderTextColor={C.muted2}
          style={styles.input}
        />
      </View>
      {!!(error || help) && (
        <Animated.View entering={FadeIn.duration(160)} style={styles.helpWrap}>
          <Txt style={[styles.help, { color: error ? '#A64736' : C.muted3 }]}>{error ?? help}</Txt>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Date → "14 / 03 / 1994". */
const formatDob = (d: Date) => pad2(d.getDate()) + ' / ' + pad2(d.getMonth() + 1) + ' / ' + d.getFullYear();

/** "14 / 03 / 1994" → Date (or a sensible default for an empty field). */
function parseDob(dob: string) {
  const m = dob.match(/^(\d{2}) \/ (\d{2}) \/ (\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : new Date(1995, 0, 1);
}

const MIN_DOB = new Date(1900, 0, 1);
const today = () => new Date();

function CalendarIcon() {
  return (
    <Svg width={17} height={17} viewBox="0 0 20 20" fill="none">
      <Rect x={3.2} y={4.6} width={13.6} height={12.2} rx={2} stroke={C.muted} strokeWidth={1.5} />
      <Path d="M3.2 8h13.6M7 3.2v2.6M13 3.2v2.6" stroke={C.muted} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Date-of-birth field that opens the native date picker: the system dialog on Android, and a
 * bottom sheet with the iOS wheel picker plus Done.
 */
function DobField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => parseDob(value));

  const show = () => {
    Keyboard.dismiss();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: parseDob(value),
        mode: 'date',
        minimumDate: MIN_DOB,
        maximumDate: today(),
        onChange: (e, d) => {
          if (e.type === 'set' && d) onChange(formatDob(d));
        },
      });
    } else {
      setDraft(parseDob(value));
      setOpen(true);
    }
  };

  return (
    <View style={styles.field}>
      <Txt numberOfLines={1} style={styles.label}>
        DATE OF BIRTH (OPTIONAL)
      </Txt>
      <Tap accessibilityRole="button" accessibilityLabel="Date of birth" onPress={show} style={[styles.box, error ? styles.boxError : open && styles.boxActive]}>
        <Txt numberOfLines={1} style={[styles.input, !value && { color: C.muted2 }]}>{value || 'DD / MM / YYYY'}</Txt>
        <CalendarIcon />
      </Tap>
      <View style={styles.helpWrap}>
        <Txt style={[styles.help, { color: error ? '#A64736' : C.muted3 }]}>{error ?? 'Used only to verify age-restricted items'}</Txt>
      </View>

      <BottomSheet visible={open} onClose={() => setOpen(false)} style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Tap onPress={() => setOpen(false)} hitSlop={8}>
            <Txt style={[f(500, 14, 1.2), { color: C.muted }]}>Cancel</Txt>
          </Tap>
          <Txt style={f(700, 15, 1.2)}>Date of birth</Txt>
          <Tap
            onPress={() => {
              onChange(formatDob(draft));
              setOpen(false);
            }}
            hitSlop={8}>
            <Txt style={[f(700, 14, 1.2), { color: C.green }]}>Done</Txt>
          </Tap>
        </View>
        <DateTimePicker
          value={draft}
          mode="date"
          display="spinner"
          themeVariant="light"
          textColor={C.ink}
          minimumDate={MIN_DOB}
          maximumDate={today()}
          onChange={(_, d) => d && setDraft(d)}
          style={styles.wheel}
        />
      </BottomSheet>
    </View>
  );
}

/** Empty is fine (optional); otherwise a real past date in DD / MM / YYYY. */
function dobError(dob: string) {
  if (!dob.trim()) return undefined;
  const m = dob.match(/^(\d{2}) \/ (\d{2}) \/ (\d{4})$/);
  if (!m) return 'Use DD / MM / YYYY';
  const [dd, mm, yyyy] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(yyyy, mm - 1, dd);
  const valid = date.getFullYear() === yyyy && date.getMonth() === mm - 1 && date.getDate() === dd;
  return valid && yyyy >= 1900 && date < new Date() ? undefined : 'Enter a valid date of birth';
}

/** After sign-up (setup mode) the app continues to the delivery address picker. */
function finishSetup() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/location');
}

/**
 * Personal details (prototype `sPersonal`). With `?setup=1` it is the sign-up step shown right
 * after OTP: empty name / date-of-birth fields, a Skip link and a single Save button.
 */
export default function PersonalScreen() {
  const pad = usePad();
  const flash = useApp((s) => s.flash);
  const user = useApp((s) => s.user);
  const phone = useApp((s) => s.phone);
  const setup = useLocalSearchParams<{ setup?: string }>().setup === '1';
  const [focus, setFocus] = useState<FieldKey | null>(null);
  const [initial] = useState(() => ({
    first: setup ? '' : user.first,
    last: setup ? '' : user.last,
    email: user.email,
    mobile: '+61 ' + (setup && phone ? phone : user.mobile).replace(/(\d{3})(?=\d)/g, '$1 '),
    dob: setup ? '' : user.dob,
  }));
  const [v, setV] = useState(initial);
  const [avatar, setAvatar] = useState(setup ? undefined : user.avatar);
  const changePhoto = async () => {
    const uri = await pickPhoto({ title: 'Profile photo', square: true });
    if (uri) setAvatar(uri);
  };
  const [tried, setTried] = useState(false);
  const upd = (k: FieldKey) => (t: string) => setV((s) => ({ ...s, [k]: t }));
  const dirty = (Object.keys(v) as FieldKey[]).some((k) => v[k] !== initial[k]) || avatar !== (setup ? undefined : user.avatar);

  const local = v.mobile.replace(/\D/g, '').replace(/^61/, '').replace(/^0/, '');
  const mobileErr = !/^\d{9}$/.test(local) ? 'Enter a 9-digit mobile number' : undefined;
  // Email is optional (not asked at sign-up); only check it once the user types one.
  const emailErr = v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim()) ? 'Enter a valid email address' : undefined;
  const nameErr = !v.first.trim() ? 'Enter your first name' : !setup && !v.last.trim() ? 'Enter your first and last name' : undefined;
  const dobErr = dobError(v.dob);

  const discard = () => {
    setV(initial);
    setTried(false);
    goBack();
  };

  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving) return;
    const err = setup ? (nameErr ?? dobErr) : (nameErr ?? emailErr ?? mobileErr ?? dobErr);
    if (err) {
      setTried(true);
      flash(err);
      return;
    }
    setSaving(true);
    try {
      const user = await saveProfile({ first: v.first.trim(), last: v.last.trim(), email: v.email.trim(), mobile: local, dob: v.dob.trim(), avatar });
      useApp.getState().set({ user });
    } catch (e) {
      if (__DEV__) console.warn('Could not save profile:', (e as Error).message);
      flash("Couldn't save your details. Please try again.");
      return;
    } finally {
      setSaving(false);
    }
    if (setup) {
      flash('Welcome to Spice Kart, ' + v.first.trim() + '!');
      finishSetup();
      return;
    }
    flash('Changes saved');
    goBack();
  };

  return (
    <Screen>
      <Grad preset="header" style={[styles.header, { paddingTop: pad.top(42) }]}>
        <Tap accessibilityLabel="Back" onPress={setup ? () => router.replace('/login') : goBack} hitSlop={8} style={styles.back}>
          <BackIcon color={FOREST} />
        </Tap>
        <View style={styles.titles}>
          <Txt numberOfLines={1} style={styles.title}>
            Personal details
          </Txt>
          {!setup && (
            <Txt numberOfLines={1} style={styles.subtitle}>
              {dirty ? 'Unsaved changes' : 'Name, email and mobile'}
            </Txt>
          )}
        </View>
        {setup && (
          <Tap accessibilityRole="button" onPress={finishSetup} hitSlop={10} style={styles.skip}>
            <Txt style={styles.skipText}>Skip</Txt>
          </Tap>
        )}
      </Grad>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.avatarBlock}>
            <Tap accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={changePhoto} style={styles.avatar}>
              {avatar && <Image source={{ uri: avatar }} contentFit="cover" style={styles.avatarPhoto} />}
              {!avatar && <Txt style={styles.initials}>{((v.first.trim()[0] ?? '') + (v.last.trim()[0] ?? '')).toUpperCase() || '?'}</Txt>}
              <View style={styles.editBadge}>
                <Svg width={14} height={14} viewBox="0 0 20 20" fill="none">
                  <Path d="M4 15.2l9.1-9.1 2.8 2.8-9.1 9.1H4v-2.8z" stroke={FOREST} strokeWidth={1.6} strokeLinejoin="round" />
                </Svg>
              </View>
            </Tap>
            <Tap onPress={changePhoto} hitSlop={8} style={styles.changePhoto}>
              <Txt numberOfLines={1} style={styles.changePhotoText}>
                Change photo
              </Txt>
            </Tap>
          </View>

          <Field
            label="FIRST NAME"
            value={v.first}
            onChange={upd('first')}
            focused={focus === 'first'}
            onFocus={() => setFocus('first')}
            placeholder="First name"
            error={tried && !v.first.trim() ? 'Enter your first name' : undefined}
          />
          <Field label="LAST NAME" value={v.last} onChange={upd('last')} focused={focus === 'last'} onFocus={() => setFocus('last')} placeholder="Last name" />
          {!setup && (
            <>
              <Field
                label="EMAIL ADDRESS (OPTIONAL)"
                value={v.email}
                onChange={upd('email')}
                focused={focus === 'email'}
                onFocus={() => setFocus('email')}
                keyboardType="email-address"
                error={tried ? emailErr : undefined}
              />
              <Field
                label="MOBILE NUMBER"
                value={v.mobile}
                onChange={upd('mobile')}
                focused={focus === 'mobile'}
                onFocus={() => setFocus('mobile')}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'phone-pad'}
                error={tried || focus === 'mobile' ? mobileErr : undefined}
              />
            </>
          )}
          <DobField value={v.dob} onChange={upd('dob')} error={tried ? dobErr : undefined} />

          <View style={styles.note}>
            <Svg width={15} height={15} viewBox="0 0 20 20" fill="none" style={styles.noteIcon}>
              <Rect x={4.6} y={8.6} width={10.8} height={8} rx={2} stroke={LINK} strokeWidth={1.5} />
              <Path d="M7.2 8.6V6.8a2.8 2.8 0 015.6 0v1.8" stroke={LINK} strokeWidth={1.5} />
            </Svg>
            <Txt style={styles.noteText}>Your details are encrypted and never shared with delivery partners beyond your name.</Txt>
          </View>
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: pad.bottom(30) }]}>
          <Tap onPress={save} accessibilityRole="button" style={styles.saveBtn} pressedStyle={{ backgroundColor: C.limeHover }}>
            <Txt style={styles.saveText}>{saving ? 'Saving…' : setup ? 'Save' : 'Save changes'}</Txt>
          </Tap>
          {!setup && (
            <Tap onPress={discard} accessibilityRole="button" style={styles.discardBtn} pressedStyle={{ backgroundColor: '#FAFBF7' }}>
              <Txt style={styles.discardText}>Discard changes</Txt>
            </Tap>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingLeft: 16,
    paddingRight: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DFE8CD',
  },
  back: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  skip: { marginLeft: 'auto', paddingVertical: 4, paddingLeft: 12 },
  skipText: { ...f(600, 13, 1.2), color: C.greenMuted },
  titles: { gap: 4, flexShrink: 1 },
  title: { ...f(700, 15.5, 1.2), color: FOREST },
  subtitle: { ...f(400, 11, 1), color: '#526A54' },
  content: { paddingTop: 17.5, paddingHorizontal: 16, paddingBottom: 20, gap: 13.5 },
  avatarBlock: { alignItems: 'center', gap: 9, paddingBottom: 1 },
  avatar: { width: 80, height: 80, borderRadius: 22, backgroundColor: FOREST, alignItems: 'center', justifyContent: 'center' },
  initials: { ...f(700, 26, 1), color: LIME },
  avatarPhoto: { ...StyleSheet.absoluteFill, borderRadius: 22 },
  editBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 31,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: LIME,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: { paddingVertical: 1, paddingHorizontal: 6 },
  changePhotoText: { ...f(600, 11.5, 1), color: LINK },
  field: { gap: 8 },
  label: { ...f(600, 10.5, 1), letterSpacing: 0.6, color: C.muted2 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10.5,
    backgroundColor: C.field,
  },
  boxActive: { borderColor: LIME, backgroundColor: '#FAFDF2' },
  boxError: { borderColor: '#DAA99E' },
  input: { ...inputFont, flex: 1, minWidth: 0, padding: 0, color: C.ink },
  helpWrap: { marginBottom: 4 },
  help: f(400, 10, 1),
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8.5,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: '#F8FAF3',
    borderWidth: 1,
    borderColor: '#EAEEDF',
  },
  noteIcon: { flexShrink: 0 },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 30, backgroundColor: '#fff' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6 },
  wheel: { alignSelf: 'stretch', height: 216 },
  noteText: { ...f(500, 10.5, 1.56), color: '#455A45', flex: 1 },
  footer: {
    flexShrink: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: C.divider,
    boxShadow: '0 -6px 18px rgba(16,24,16,0.05)',
    gap: 8,
  },
  saveBtn: {
    height: 48,
    borderRadius: 11,
    backgroundColor: LIME,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 14px rgba(27,60,34,0.14)',
  },
  saveText: { ...f(700, 14, 1), color: FOREST },
  discardBtn: {
    height: 46,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: { ...f(600, 13.5, 1), color: C.ink },
});
