import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Chip, FooterBar, OutlineButton } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import { isPolicyId, POLICIES } from '@/lib/policies';

const h2 = [f(700, 14, 1.35), { color: C.ink }];
const para = [f(400, 12.5, 1.75), { color: '#4A4A45' }];

/** A single policy document (`sPolicy`), picked by `?id=` — defaults to the refund policy. */
export default function PolicyScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const policy = POLICIES[isPolicyId(id) ? id : 'refund'];

  const scroll = useRef<ScrollView>(null);
  const chips = useRef<ScrollView>(null);
  const [chapter, setChapter] = useState(0);
  /** y offsets of the section headings inside the body view. */
  const anchors = useRef<number[]>([]);
  /** x offsets of the chips, so the active one can be scrolled into view. */
  const chipX = useRef<number[]>([]);
  const bodyY = useRef(0);
  /** Set while a chip tap is animating the scroll, so passing sections don't flicker the active chip. */
  const jumping = useRef(false);

  const select = (i: number) => {
    setChapter(i);
    chips.current?.scrollTo({ x: Math.max(0, (chipX.current[i] ?? 0) - 14), animated: true });
  };

  const jump = (i: number) => {
    select(i);
    jumping.current = true;
    const y = anchors.current[i];
    if (y != null) scroll.current?.scrollTo({ y: bodyY.current + y - 12, animated: true });
    else scroll.current?.scrollToEnd({ animated: true });
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (jumping.current) return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const y = contentOffset.y - bodyY.current + 24;
    const atEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - 4;
    let i = 0;
    anchors.current.forEach((a, n) => {
      if (a <= y) i = n;
    });
    if (atEnd) i = policy.sections.length - 1;
    if (i !== chapter) select(i);
  };

  return (
    <Screen>
      <ScreenHeader variant="tint" title={policy.title} subtitle={`Last updated ${policy.updated}`} />
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={onScroll}
        onMomentumScrollEnd={() => {
          jumping.current = false;
        }}
        onScrollBeginDrag={() => {
          jumping.current = false;
        }}>
        <View
          style={{
            backgroundColor: C.selectedBg,
            borderWidth: 1,
            borderColor: '#DCEDC2',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 13,
          }}>
          <Txt style={[f(400, 12.5, 1.6), { color: C.greenDeep }]}>{policy.intro}</Txt>
        </View>
        <ScrollView
          ref={chips}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ gap: 7, paddingHorizontal: 14 }}>
          {policy.sections.map((s, i) => (
            <View
              key={s.heading}
              onLayout={(e) => {
                chipX.current[i] = e.nativeEvent.layout.x;
              }}>
              <Chip label={`${i + 1}. ${s.heading}`} size={11} active={chapter === i} onPress={() => jump(i)} />
            </View>
          ))}
        </ScrollView>
        <View
          style={{ gap: 9 }}
          onLayout={(e) => {
            bodyY.current = e.nativeEvent.layout.y;
          }}>
          {policy.sections.map((s, i) => (
            <View
              key={s.heading}
              style={{ gap: 9, marginTop: i ? 4 : 0 }}
              onLayout={(e) => {
                anchors.current[i] = e.nativeEvent.layout.y;
              }}>
              <Txt style={h2}>
                {i + 1}. {s.heading}
              </Txt>
              {s.body.map((p) => (
                <Txt key={p} style={para}>
                  {p}
                </Txt>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <FooterBar>
        <OutlineButton label="Questions? Contact support" onPress={() => router.push('/support')} />
      </FooterBar>
    </Screen>
  );
}
