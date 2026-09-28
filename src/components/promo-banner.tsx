import { Image } from 'expo-image';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { Grad, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';
import { openBanner, type Banner } from '@/lib/remote-banners';

/** Colour themes cycled across banners (the admin picks copy and image, not colours). */
const THEMES = [
  { bg: '#E7F1DA', border: '#D8E4C8', fade: 'rgba(231,241,218,0)', tagBg: C.lime, ink: C.forest, subInk: C.greenMuted },
  { bg: '#F4EEDE', border: '#E7DFCA', fade: 'rgba(244,238,222,0)', tagBg: '#EBD9A8', ink: '#4A3A16', subInk: '#6B5A31' },
];

/**
 * Admin banner: photo on the right and a fading tint behind the copy — subtitle as the tag, the
 * title, then "<CTA> →" (same layout as the admin's app preview).
 */
export function PromoBanner({ b, index = 0, width = 282 }: { b: Banner; index?: number; width?: DimensionValue }) {
  const t = THEMES[index % THEMES.length];
  return (
    <Tap onPress={() => openBanner(b)} accessibilityLabel={b.title} style={[styles.banner, { width, backgroundColor: t.bg, borderColor: t.border }]}>
      <Image source={b.image_url ? { uri: b.image_url } : LOCAL.bannerFresh} contentFit="cover" style={styles.photo} />
      <Grad colors={[t.bg, t.bg, t.fade]} locations={[0, 0.72, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.copy}>
        {!!b.subtitle.trim() && (
          <View style={[styles.tag, { backgroundColor: t.tagBg }]}>
            <Txt numberOfLines={1} style={[f(700, 11, 1.2), { letterSpacing: 1, color: t.ink }]}>{b.subtitle.toUpperCase()}</Txt>
          </View>
        )}
        <Txt numberOfLines={2} style={[f(700, 16.5, 1.2), { color: t.ink }]}>{b.title}</Txt>
        {!!b.cta_label.trim() && <Txt numberOfLines={1} style={[f(600, 13, 1.2), { color: t.subInk }]}>{b.cta_label.trim()} →</Txt>}
      </Grad>
    </Tap>
  );
}

const styles = StyleSheet.create({
  banner: { flexShrink: 0, height: 143, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  photo: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 150 },
  copy: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 200, paddingHorizontal: 14, justifyContent: 'center', gap: 8 },
  tag: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 4, marginBottom: 2 },
});
