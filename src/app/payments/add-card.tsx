import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { Card, Field, Footer, SecureNote, StarIcon, ToggleRow, scrollContent } from '@/components/account-forms/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Screen } from '@/components/ui/primitives';
import { C } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { useApp, usePref } from '@/store/app-store';

/** Add a card (prototype `sAddCard`). */
export default function AddCardScreen() {
  const flash = useApp((s) => s.flash);
  const togglePref = useApp((s) => s.togglePref);
  const saveCard = usePref('saveCard', true);
  const defCard = usePref('defCard', false);

  const save = () => {
    flash('Card added securely');
    goBack();
  };

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Add card" subtitle="Visa, Mastercard and Amex" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <Field label="CARD NUMBER" active defaultValue="4417 1288 •••• ••••" keyboardType="number-pad" textContentType="creditCardNumber" autoComplete="cc-number" />
          <View style={{ flexDirection: 'row', gap: 9 }}>
            <Field label="EXPIRY" defaultValue="09 / 28" keyboardType="number-pad" autoComplete="cc-exp" style={{ flex: 1, minWidth: 0 }} />
            <Field label="CVV" defaultValue="123" secureTextEntry keyboardType="number-pad" maxLength={4} autoComplete="cc-csc" hint="3 digits on the back" style={{ flex: 1, minWidth: 0 }} />
          </View>
          <Field label="CARDHOLDER NAME" defaultValue="JAIVEER SINGH" autoCapitalize="characters" textContentType="name" autoComplete="cc-name" />
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
          <SecureNote />
        </ScrollView>
        <Footer label="Add card" onPress={save} />
      </KeyboardAvoidingView>
    </Screen>
  );
}
