import { useEffect, type ReactNode } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { create } from 'zustand';

import { Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';

export type PhotoSource = 'camera' | 'library';

type Ask = { title: string; open: boolean; resolve: ((s: PhotoSource | null) => void) | null };
const useAsk = create<Ask>(() => ({ title: '', open: false, resolve: null }));

/** Show the "Take photo / Choose from library" sheet; resolves with the choice, or null if dismissed. */
export function askPhotoSource(title: string): Promise<PhotoSource | null> {
  useAsk.getState().resolve?.(null);
  return new Promise((resolve) => useAsk.setState({ title, open: true, resolve }));
}

function answer(source: PhotoSource | null) {
  const { resolve } = useAsk.getState();
  useAsk.setState({ open: false, resolve: null });
  resolve?.(source);
}

function CameraIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.3l1.4-2h5.6l1.4 2h1.3A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke={C.green} strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx={12} cy={12.5} r={3.3} stroke={C.green} strokeWidth={1.7} />
    </Svg>
  );
}

function GalleryIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x={3.5} y={4.5} width={17} height={15} rx={2.5} stroke={C.green} strokeWidth={1.7} />
      <Circle cx={9} cy={9.5} r={1.6} stroke={C.green} strokeWidth={1.5} />
      <Path d="m4 17 4.6-4.4a1.5 1.5 0 0 1 2.1 0L15 17m-1.8-1.8 1.9-1.8a1.5 1.5 0 0 1 2.1 0L20 16" stroke={C.green} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Chevron() {
  return (
    <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
      <Path d="m6 3.5 4.5 4.5L6 12.5" stroke={C.muted3} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Option({ icon, label, hint, onPress }: { icon: ReactNode; label: string; hint: string; onPress: () => void }) {
  return (
    <Tap accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.option} pressedStyle={{ backgroundColor: C.selectedBg, borderColor: C.limeBorder }}>
      <View style={styles.iconBox}>{icon}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt style={f(600, 13.5, 1.3)}>{label}</Txt>
        <Txt style={[f(400, 11.5, 1.4), { color: C.muted }]}>{hint}</Txt>
      </View>
      <Chevron />
    </Tap>
  );
}

/**
 * App-styled photo source picker (replaces the native alert). Mounted once in the root layout,
 * above the Stack — not in a Modal, whose Android window stops short of the navigation bar.
 */
export function PhotoSourceSheet() {
  const { title, open } = useAsk();
  const pad = usePad();

  // Android back closes the sheet.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      answer(null);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 80 }]} pointerEvents={open ? 'auto' : 'none'}>
      {open && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(180)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => answer(null)} accessibilityLabel="Close" />
        </Animated.View>
      )}
      {open && (
        <Animated.View
          accessibilityViewIsModal
          entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(200)}
          style={[styles.sheet, { paddingBottom: pad.bottom(30) }]}>
          <View style={styles.grabber} />
          <View style={{ gap: 4, marginBottom: 6 }}>
            <Txt style={f(700, 15, 1.3)}>{title}</Txt>
            <Txt style={[f(400, 12, 1.5), { color: C.muted }]}>Take a new photo or pick one from your gallery.</Txt>
          </View>
          <Option icon={<CameraIcon />} label="Take photo" hint="Use your camera" onPress={() => answer('camera')} />
          <Option icon={<GalleryIcon />} label="Choose from library" hint="Pick from your photos" onPress={() => answer('library')} />
          <Tap accessibilityRole="button" onPress={() => answer(null)} style={styles.cancel}>
            <Txt style={f(600, 13, 1.2)}>Cancel</Txt>
          </Tap>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: C.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, paddingHorizontal: 16, gap: 10 },
  grabber: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.borderCard,
    borderRadius: 14,
    backgroundColor: C.white,
  },
  iconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.selectedBgAlt, alignItems: 'center', justifyContent: 'center' },
  cancel: { height: 46, marginTop: 4, borderWidth: 1, borderColor: C.border, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
});
