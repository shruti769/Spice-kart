import { Image } from 'expo-image';
import { useState } from 'react';
import { FlatList, Modal, StatusBar, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';

type Src = string | number;
const source = (s: Src) => (typeof s === 'string' ? { uri: s } : s);
const pageOf = (e: NativeSyntheticEvent<NativeScrollEvent>, width: number) => Math.round(e.nativeEvent.contentOffset.x / width);

function Dots({ count, active, light }: { count: number; active: number; light?: boolean }) {
  return (
    <View pointerEvents="none" style={{ flexDirection: 'row', gap: 5, alignSelf: 'center' }}>
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            width: i === active ? 16 : 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: i === active ? (light ? '#fff' : C.forest) : light ? 'rgba(255,255,255,0.45)' : 'rgba(23,32,26,0.22)',
          }}
        />
      ))}
    </View>
  );
}

/**
 * Product page hero: swipe through every photo (dots underneath when there's more than one); tap
 * opens the full-screen viewer. Fills its parent, so the parent sets the height.
 */
export function ProductGallery({ images, name }: { images: Src[]; name: string }) {
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);

  return (
    <View style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          data={images}
          keyExtractor={(s, i) => String(s) + i}
          horizontal
          pagingEnabled
          bounces={images.length > 1}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(pageOf(e, width))}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          renderItem={({ item, index }) => (
            <Tap
              accessibilityRole="imagebutton"
              accessibilityLabel={images.length > 1 ? `${name}, photo ${index + 1} of ${images.length}. Open full screen` : `${name}. Open full screen`}
              onPress={() => setViewer(index)}
              style={{ width, height: '100%' }}>
              <Image source={source(item)} contentFit="cover" transition={180} cachePolicy="memory-disk" style={{ flex: 1 }} />
            </Tap>
          )}
        />
      )}
      {images.length > 1 && (
        <View pointerEvents="none" style={{ position: 'absolute', bottom: 12, right: 12 }}>
          <View style={{ paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.9)' }}>
            <Dots count={images.length} active={page} />
          </View>
        </View>
      )}
      {viewer !== null && <PhotoViewer images={images} start={viewer} name={name} onClose={() => setViewer(null)} />}
    </View>
  );
}

const MAX_ZOOM = 4;

/** One photo that zooms with a pinch or a double tap, and pans while zoomed. */
function ZoomablePhoto({ src, width, height, onZoom }: { src: Src; width: number; height: number; onZoom: (zoomed: boolean) => void }) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const [zoomed, setZoomed] = useState(false);

  const report = (z: boolean) => {
    setZoomed(z);
    onZoom(z);
  };

  // Keep the photo covering the screen: at most half the extra size in each direction.
  const clamp = (v: number, s: number, size: number) => {
    'worklet';
    const max = ((s - 1) * size) / 2;
    return Math.min(max, Math.max(-max, v));
  };

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    x.value = withTiming(0);
    y.value = withTiming(0);
    scheduleOnRN(report, false);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX_ZOOM, Math.max(1, startScale.value * e.scale));
      x.value = clamp(x.value, scale.value, width);
      y.value = clamp(y.value, scale.value, height);
    })
    .onEnd(() => {
      if (scale.value < 1.05) reset();
      else scheduleOnRN(report, true);
    });

  // Only while zoomed, so a swipe at 1× still moves to the next photo.
  const pan = Gesture.Pan()
    .enabled(zoomed)
    .onStart(() => {
      startX.value = x.value;
      startY.value = y.value;
    })
    .onUpdate((e) => {
      x.value = clamp(startX.value + e.translationX, scale.value, width);
      y.value = clamp(startY.value + e.translationY, scale.value, height);
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) reset();
      else {
        scale.value = withTiming(2.5);
        scheduleOnRN(report, true);
      }
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
      <View style={{ width, height, overflow: 'hidden' }}>
        <Animated.View style={[{ flex: 1 }, style]}>
          <Image source={source(src)} contentFit="contain" cachePolicy="memory-disk" style={{ flex: 1 }} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/** Full-screen photos: swipe between them, pinch or double-tap to zoom. */
function PhotoViewer({ images, start, name, onClose }: { images: Src[]; start: number; name: string; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const pad = usePad();
  const [page, setPage] = useState(start);
  const [zoomed, setZoomed] = useState(false);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait']}>
      <StatusBar barStyle="light-content" />
      {/* A Modal is outside the app's root view, so gestures need their own root here. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
        <FlatList
          data={images}
          keyExtractor={(s, i) => String(s) + i}
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed && images.length > 1}
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setPage(pageOf(e, width))}
          renderItem={({ item }) => <ZoomablePhoto src={item} width={width} height={height} onZoom={setZoomed} />}
        />
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: pad.insets.top + 8, left: 14, right: 14, flexDirection: 'row', alignItems: 'center' }}>
          <Txt numberOfLines={1} style={[f(600, 13, 1.2), { color: '#fff', flex: 1 }]}>
            {name}
            {images.length > 1 ? `  ·  ${page + 1} / ${images.length}` : ''}
          </Txt>
          <Tap
            accessibilityLabel="Close photos"
            onPress={onClose}
            hitSlop={10}
            pressedStyle={{ opacity: 0.6 }}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
            <Txt style={[f(500, 20, 1), { color: '#fff' }]}>×</Txt>
          </Tap>
        </View>
        {images.length > 1 && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: pad.insets.bottom + 18 }}>
            <Dots count={images.length} active={page} light />
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}
