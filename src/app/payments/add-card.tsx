import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Card, Field, Footer, SecureNote, StarIcon, ToggleRow, scrollContent } from '@/components/account-forms/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { useApp, usePref, type SavedCard } from '@/store/app-store';

/** Card network from the leading digits (test cards like 4242 4242 4242 4242 work). */
function brandOf(digits: string): SavedCard['brand'] | null {
  if (/^4/.test(digits)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'MASTERCARD';
  if (/^3[47]/.test(digits)) return 'AMEX';
  return null;
}

/** Standard Luhn checksum used by all card numbers. */
function luhn(digits: string) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** "0928" → "09 / 28". */
function formatExpiry(value: string) {
  const d = value.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + ' / ' + d.slice(2) : d;
}

/** Add a card (prototype `sAddCard`). */
export default function AddCardScreen() {
  const flash = useApp((s) => s.flash);
  const togglePref = useApp((s) => s.togglePref);
  const saveCard = usePref('saveCard', true);
  const defCard = usePref('defCard', false);

  const [form, setForm] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [error, setError] = useState('');
  const edit = (key: keyof typeof form, format: (v: string) => string = (v) => v) => (value: string) => {
    setError('');
    setForm((f) => ({ ...f, [key]: format(value) }));
  };

  const save = () => {
    const digits = form.number.replace(/\D/g, '');
    const brand = brandOf(digits);
    const [mm, yy] = form.expiry.split('/').map((p) => parseInt(p, 10));
    const now = new Date();
    const expired = !mm || !yy || mm > 12 || 2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1);
    if (!brand || digits.length < 13 || !luhn(digits)) return setError('Enter a valid Visa, Mastercard or Amex number');
    if (expired) return setError('Enter a valid expiry date (MM / YY)');
    if (!/^\d{3,4}$/.test(form.cvv)) return setError('Enter the 3 or 4 digit CVV');
    if (!form.name.trim()) return setError('Enter the name on the card');

    const card = { brand, last4: digits.slice(-4), exp: String(mm).padStart(2, '0') + '/' + String(yy).padStart(2, '0') };
    if (saveCard) {
      useApp.getState().addCard(card, defCard);
      flash('Card ending ' + card.last4 + ' added securely');
    } else flash('Card ending ' + card.last4 + ' will be used once');
    goBack();
  };

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Add card" subtitle="Visa, Mastercard and Amex" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <Field
            label="CARD NUMBER"
            active
            value={form.number}
            onChangeText={edit('number', (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '))}
            placeholder="1234 5678 9012 3456"
            keyboardType="number-pad"
            textContentType="creditCardNumber"
            autoComplete="cc-number"
          />
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Field
              label="EXPIRY"
              value={form.expiry}
              onChangeText={edit('expiry', formatExpiry)}
              placeholder="MM / YY"
              keyboardType="number-pad"
              autoComplete="cc-exp"
              style={{ flex: 1, minWidth: 0 }} />
            <Field label="CVV" value={form.cvv} onChangeText={edit('cvv', (v) => v.replace(/\D/g, ''))} placeholder="•••" secureTextEntry keyboardType="number-pad" maxLength={4} autoComplete="cc-csc" hint="3 digits on the back" style={{ flex: 1, minWidth: 0 }} />
          </View>
          <Field label="CARDHOLDER NAME" value={form.name} onChangeText={edit('name')} placeholder="NAME ON CARD" autoCapitalize="characters" textContentType="name" autoComplete="cc-name" />
          <Card>
            <ToggleRow
              icon={
                <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
                  <Rect x={2.6} y={5} width={14.8} height={10} rx={2} stroke={C.ink2} strokeWidth={1.5} />
                  <Path d="M2.6 8.6h14.8" stroke={C.ink2} strokeWidth={1.5} />
                </Svg>
              }
              title="Save this card"
              sub="Stored securely for faster checkout"
              value={saveCard}
              onToggle={() => togglePref('saveCard', true)}
            />
            <ToggleRow
              icon={<StarIcon />}
              title="Set as default"
              sub="Used first on every order"
              value={defCard}
              onToggle={() => togglePref('defCard', false)}
            />
          </Card>
          {!!error && <Txt style={[f(500, 12, 1.3), { color: C.danger }]}>{error}</Txt>}
          <SecureNote />
        </ScrollView>
        <Footer label="Add card" onPress={save} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
