import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Footer, SecureNote } from '@/components/account-forms/parts';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Txt } from '@/components/ui/primitives';
import { f } from '@/constants/theme';
import { goBack } from '@/lib/nav';
import { saveStripeCard } from '@/lib/stripe-wallet';
import { useApp } from '@/store/app-store';

export default function AddCardScreen() {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (await saveStripeCard()) {
        useApp.getState().flash('Card saved securely');
        goBack();
      }
    } catch (e) {
      useApp.getState().flash(e instanceof Error ? e.message : 'Could not save card');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Screen>
      <ScreenHeader variant="tint" title="Add card" subtitle="Save a card for future payments" />
      <View style={{ padding: 20, gap: 20 }}>
        <Txt style={f(400, 14, 1.4)}>
          Enter your card details securely on the next screen. By continuing, you agree to save this card for future
          payments you confirm in SpiceKart.
        </Txt>
        <SecureNote />
      </View>
      <Footer label={busy ? 'Opening…' : 'Continue to secure card setup'} onPress={save} />
    </Screen>
  );
}
