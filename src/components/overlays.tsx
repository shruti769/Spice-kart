import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';

import { Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { useApp } from '@/store/app-store';

/** Global toast (`bottom:126px`, dark pill). Mounted once in the root layout. */
export function Toast() {
  const toast = useApp((s) => s.toast);
  const pad = usePad();
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: pad.bottom(126), zIndex: 70, alignItems: 'center' }}>
      <Animated.View
        key={toast}
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(160)}
        style={{ backgroundColor: C.toast, borderRadius: 7, paddingVertical: 9, paddingHorizontal: 13 }}>
        <Txt style={[f(500, 11.5, 1), { color: '#fff' }]}>{toast}</Txt>
      </Animated.View>
    </View>
  );
}

/**
 * Keeps an overlay mounted long enough for its exit animation. Reanimated layout
 * animations inside a Modal don't run on unmount, so we delay closing the Modal.
 */
function useDelayedVisible(visible: boolean, ms = 200) {
  const [shown, setShown] = useState(visible);
  if (visible && !shown) setShown(true);
  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setShown(false), ms);
    return () => clearTimeout(t);
  }, [visible, ms]);
  return shown;
}

type OverlayProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Backdrop tint — sheets use .35, dialogs .4 in the prototype. */
  dim?: number;
  style?: StyleProp<ViewStyle>;
};

/** Bottom sheet: dimmed backdrop + white panel sliding up from the bottom. */
export function BottomSheet({ visible, onClose, children, dim = 0.35, style }: OverlayProps) {
  const shown = useDelayedVisible(visible);
  if (!shown) return null;
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {visible && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${dim})` }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
      )}
      <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        {visible && (
          <Animated.View
            entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(200)}
            style={[{ backgroundColor: '#fff' }, style]}>
            {children}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

/** Centered dialog card on a dimmed backdrop. */
export function CenterDialog({ visible, onClose, children, dim = 0.4, style }: OverlayProps) {
  const shown = useDelayedVisible(visible);
  if (!shown) return null;
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      {visible && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${dim})` }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
      )}
      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }} pointerEvents="box-none">
        {visible && (
          <Animated.View entering={ZoomIn.duration(200).springify().damping(18)} exiting={ZoomOut.duration(160)} style={style}>
            {children}
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}
