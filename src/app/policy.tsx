import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip, FooterBar, OutlineButton, SearchButton } from '@/components/help/kit';
import { ScreenHeader } from '@/components/screen-header';
import { Screen, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';

const CHAPTERS = ['1. Cancelling', '2. Refunds', '3. Fresh items', '4. Disputes'];

const h2 = [f(700, 14, 1.35), { color: C.ink }];
const para = [f(400, 12.5, 1.75), { color: '#4A4A45' }];

/** Refund & cancellation policy (`sPolicy`). */
export default function PolicyScreen() {
  const scroll = useRef<ScrollView>(null);
  const [chapter, setChapter] = useState(0);
  /** y offsets of the section headings inside the scroll content. */
  const anchors = useRef<number[]>([]);
  const bodyY = useRef(0);

  const jump = (i: number) => {
    setChapter(i);
    const y = anchors.current[i];
    if (y != null) scroll.current?.scrollTo({ y: bodyY.current + y - 12, animated: true });
    else scroll.current?.scrollToEnd({ animated: true });
  };

  return (
    <Screen>
      <ScreenHeader variant="tint" title="Refund & Cancellation" subtitle="Last updated 24 Aug 2026" />
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 14, paddingBottom: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}>
        <SearchButton placeholder="Search within this policy" onPress={() => router.push('/help/search')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -14 }}
          contentContainerStyle={{ gap: 7, paddingHorizontal: 14 }}>
          {CHAPTERS.map((c, i) => (
            <Chip key={c} label={c} size={11} active={chapter === i} onPress={() => jump(i)} />
          ))}
        </ScrollView>
        <View
          style={{ gap: 9 }}
          onLayout={(e) => {
            bodyY.current = e.nativeEvent.layout.y;
          }}>
          <Txt
            style={h2}
            onLayout={(e) => {
              anchors.current[0] = e.nativeEvent.layout.y;
            }}>
            1. Cancelling an order
          </Txt>
          <Txt style={para}>
            You may cancel any order free of charge until your shopper begins picking. Once picking has started, a
            restocking fee of up to $4.95 may apply to fresh and chilled items that cannot be returned to the shelf.
          </Txt>
          <Txt style={para}>
            Orders already out for delivery cannot be cancelled in the app. Contact support and our team will assist where
            possible.
          </Txt>
          <Txt
            style={[h2, { marginTop: 4 }]}
            onLayout={(e) => {
              anchors.current[1] = e.nativeEvent.layout.y;
            }}>
            2. How refunds are issued
          </Txt>
          <Txt style={para}>
            Approved refunds are credited to Spice Kart Money immediately. If you prefer your original payment method,
            refunds are returned within 3–5 business days depending on your bank.
          </Txt>
          <Txt
            style={[h2, { marginTop: 4 }]}
            onLayout={(e) => {
              anchors.current[2] = e.nativeEvent.layout.y;
            }}>
            3. Fresh and perishable items
          </Txt>
          <Txt style={para}>
            Report quality issues with fresh produce, dairy, meat and bakery items within 24 hours of delivery. A photo
            helps us process the refund faster and improve our sourcing.
          </Txt>
        </View>
      </ScrollView>
      <FooterBar>
        <OutlineButton label="Contact support" onPress={() => router.push('/support')} />
      </FooterBar>
    </Screen>
  );
}
