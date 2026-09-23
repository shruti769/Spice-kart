import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { CenterDialog } from '@/components/overlays';
import { Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';

/** "Delete your account?" confirmation (prototype `dlgDeleteAcct`). Both buttons just close it. */
export function DeleteAccountDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <CenterDialog
      visible={visible}
      onClose={onClose}
      style={{
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        gap: 11,
        boxShadow: '0 20px 44px rgba(0,0,0,0.22)',
      }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 11,
          backgroundColor: '#FDF0EC',
          borderWidth: 1,
          borderColor: '#EEDAD5',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Svg width={15} height={15} viewBox="0 0 20 20" fill="none">
          <Path d="M5 3.4h6.6L15.5 7v9.6a1 1 0 01-1 1H6a1 1 0 01-1-1V3.4z" stroke="#3F3F3B" strokeWidth={1.5} strokeLinejoin="round" />
          <Path d="M7.6 10.4h4.4M7.6 13h3" stroke="#3F3F3B" strokeWidth={1.5} strokeLinecap="round" />
        </Svg>
      </View>
      <Txt style={f(700, 15.5, 1.3)}>Delete your account?</Txt>
      <Txt style={[f(400, 12, 1.6), { color: C.muted }]}>
        This permanently removes your order history, saved addresses and any remaining Spice Kart Money. It cannot be
        undone.
      </Txt>
      <View style={{ flexDirection: 'row', gap: 8, paddingTop: 4 }}>
        <Tap
          onPress={onClose}
          accessibilityRole="button"
          style={{
            flex: 1,
            height: 44,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: 11,
            backgroundColor: '#fff',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Txt style={f(600, 12.5, 1)}>Keep account</Txt>
        </Tap>
        <Tap
          onPress={onClose}
          accessibilityRole="button"
          style={{
            flex: 1,
            height: 44,
            borderRadius: 11,
            backgroundColor: C.danger,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Txt style={[f(700, 12.5, 1), { color: '#fff' }]}>Delete</Txt>
        </Tap>
      </View>
    </CenterDialog>
  );
}
