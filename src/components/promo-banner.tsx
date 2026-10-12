import { Image } from 'expo-image';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { Grad, Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { LOCAL } from '@/data/catalog';
import { openBanner, type Banner } from '@/lib/remote-banners';

/** Colour themes for the 1st and 2nd banner of each group of three (the admin picks copy and image, not colours). */
const THEMES = [
  { bg: '#E7F1DA', border: '#D8E4C8', fade: 'rgba(231,241,218,0)', tagBg: C.lime, ink: C.forest, subInk: C.greenMuted, img: LOCAL.bannerFresh },
  { bg: '#F4EEDE', border: '#E7DFCA', fade: 'rgba(244,238,222,0)', tagBg: '#EBD9A8', ink: '#4A3A16', subInk: '#6B5A31', img: LOCAL.bannerStaples },
];

/**
 * Admin banner: photo on the right and a fading tint behind the copy — subtitle as the tag, the
 * title, then the CTA as a plain line underneath.
 */
export function PromoBanner({ b, index = 0, width }: { b: Banner; index?: number; width?: DimensionValue }) {
  // Every third banner is the dark text-only card: white title, lime line, lime stripe on the right.
  if (index % 3 === 2) {
    const line = b.cta_label.trim() || b.subtitle.trim();
    return (
      <Tap onPress={() => openBanner(b)} accessibilityLabel={b.title} style={[styles.banner, styles.dark, { width: width ?? 225 }]}>
        <Txt numberOfLines={2} style={[f(700, 15, 1.3), { color: '#fff' }]}>{b.title}</Txt>
        {!!line && <Txt numberOfLines={1} style={[f(600, 12, 1.2), { color: C.lime }]}>{line}</Txt>}
        <View style={styles.darkStripe} />
      </Tap>
    );
  }
  const t = THEMES[index % 3];
  width ??= 282;
  return (
    <Tap onPress={() => openBanner(b)} accessibilityLabel={b.title} style={[styles.banner, { width, backgroundColor: t.bg, borderColor: t.border }]}>
      <Image source={b.image_url ? { uri: b.image_url } : t.img} contentFit="cover" style={styles.photo} />
      <Grad colors={[t.bg, t.bg, t.fade]} locations={[0, 0.89, 1]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.copy}>
        {!!b.subtitle.trim() && (
          <View style={[styles.tag, { backgroundColor: t.tagBg }]}>
            <Txt numberOfLines={1} style={[f(700, 11, 1.2), { letterSpacing: 1, color: t.ink }]}>{b.subtitle.toUpperCase()}</Txt>
          </View>
        )}
        <Txt numberOfLines={2} style={[f(700, 16.5, 1.2), { color: t.ink }]}>{b.title}</Txt>
        {!!b.cta_label.trim() && <Txt numberOfLines={1} style={[f(400, 13, 1.2), { color: t.subInk }]}>{b.cta_label.trim()}</Txt>}
      </Grad>
    </Tap>
  );
}

/**
 * Admin's "Home · feature" banner: a large full-width image with the copy over a dark fade at the
 * bottom — subtitle as the tag, the title, then the CTA as a button (same layout as the admin preview).
 */
export function FeatureBanner({ b, width }: { b: Banner; width: number }) {
  if (!b.image_url) return null;
  const tag = b.subtitle.trim();
  const cta = b.cta_label.trim();
  return (
    <Tap onPress={() => openBanner(b)} accessibilityLabel={tag ? `${b.title}, ${tag}` : b.title} style={[styles.feature, { width }]}>
      <Image source={{ uri: b.image_url }} contentFit="cover" style={StyleSheet.absoluteFill} />
      <Grad colors={['rgba(12,43,26,0)', 'rgba(12,43,26,0.55)', 'rgba(12,43,26,0.92)']} locations={[0, 0.4, 1]} style={styles.featureCopy}>
        {!!tag && (
          <View style={[styles.tag, { backgroundColor: C.lime }]}>
            <Txt numberOfLines={1} style={[f(700, 11, 1.2), { letterSpacing: 1, color: C.forest }]}>{tag.toUpperCase()}</Txt>
          </View>
        )}
        <Txt numberOfLines={2} style={[f(800, 24, 1.15), { color: '#fff' }]}>{b.title}</Txt>
        {!!cta && (
          <View style={styles.featureCta}>
            <Txt numberOfLines={1} style={[f(700, 13, 1.2), { color: C.forest }]}>{cta} →</Txt>
          </View>
        )}
      </Grad>
    </Tap>
  );
}

const styles = StyleSheet.create({
  banner: { flexShrink: 0, height: 143, borderRadius: 12, overflow: 'hidden', borderWidth: 1 },
  photo: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 100 },
  // On a 282-wide banner the photo starts at 182; paddingRight keeps the text left of it (168dp fits
  // "Fresh picks for your" on Android), and only the empty 23px past the text fades over the photo.
  copy: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 205, paddingLeft: 14, paddingRight: 23, justifyContent: 'center', gap: 8 },
  dark: { borderWidth: 0, backgroundColor: C.forest, justifyContent: 'center', paddingLeft: 15, paddingRight: 36, gap: 6 },
  darkStripe: { position: 'absolute', right: 9, top: 21, bottom: 21, width: 6, backgroundColor: C.lime },
  tag: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 4, marginBottom: 2 },
  feature: { aspectRatio: 1080 / 1175, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E7F1DA' },
  featureCopy: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 70, paddingHorizontal: 18, paddingBottom: 18, gap: 8 },
  featureCta: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9, backgroundColor: C.lime },
});
