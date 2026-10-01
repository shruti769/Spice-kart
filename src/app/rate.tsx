import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';

import { StarPicker } from '@/components/reviews';
import { ScreenHeader } from '@/components/screen-header';
import { Photo, Screen, Tap, Txt, usePad } from '@/components/ui/primitives';
import { C, cardShadow, f } from '@/constants/theme';
import { REMOTE_PREFIX, findProduct, type Product } from '@/data/catalog';
import { useOrders } from '@/lib/remote-orders';
import { submitReview, useDeliveredProductIds, useMyReviews, type MyReview } from '@/lib/remote-reviews';
import { useApp } from '@/store/app-store';

/** One product: stars, an optional comment, and Submit. Starts from the customer's existing review. */
function RateCard({ p, existing }: { p: Product; existing?: MyReview }) {
  const flash = useApp((s) => s.flash);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const [saving, setSaving] = useState(false);
  const unchanged = !!existing && existing.rating === rating && existing.comment === comment.trim();

  const save = async () => {
    if (!rating || saving || unchanged) return;
    setSaving(true);
    try {
      const status = await submitReview(p.id, rating, comment);
      flash(status === 'pending' ? 'Thanks! Your review will show once it’s approved' : 'Thanks for rating ' + p.name);
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[{ backgroundColor: '#fff', borderWidth: 1, borderColor: C.borderCard, borderRadius: 12, padding: 13, gap: 12 }, cardShadow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Photo source={p.img} crop style={{ width: 44, height: 44, borderRadius: 8 }} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt numberOfLines={2} style={f(600, 13.5, 1.3)}>{p.name}</Txt>
          <Txt numberOfLines={1} style={[f(400, 11, 1.2), { color: C.muted }]}>
            {[p.brand, p.weight].filter(Boolean).join(' · ')}
          </Txt>
        </View>
      </View>

      <StarPicker value={rating} onChange={setRating} />

      {rating > 0 && (
        <>
          <TextInput
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={1000}
            placeholder="What did you like or dislike? (optional)"
            placeholderTextColor="#A8A8A2"
            allowFontScaling={false}
            selectionColor={C.green}
            textAlignVertical="top"
            style={[
              f(400, 12.5, 1.6),
              {
                minHeight: 70,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: '#E3E3DE',
                borderRadius: 10,
                backgroundColor: '#FAFAF8',
                color: C.ink,
              },
            ]}
          />
          <Tap
            onPress={save}
            disabled={saving || unchanged}
            pressedStyle={{ backgroundColor: C.limeHover }}
            style={{
              height: 42,
              borderRadius: 10,
              backgroundColor: unchanged ? '#EEF3E6' : C.lime,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {saving ? (
              <ActivityIndicator color={C.forest} />
            ) : (
              <Txt style={[f(700, 13, 1), { color: unchanged ? C.green : C.forest }]}>
                {unchanged ? (existing?.status === 'pending' ? 'Submitted · awaiting approval' : 'Submitted ✓') : existing ? 'Update review' : 'Submit review'}
              </Txt>
            )}
          </Tap>
        </>
      )}
    </View>
  );
}

/**
 * Rate products the customer has received. `?product=<id>` rates one product (from its page);
 * `?order=<id>` lists every item of a delivered order (from the Orders tab).
 */
export default function RateScreen() {
  const pad = usePad();
  const { product, order: orderId } = useLocalSearchParams<{ product?: string; order?: string }>();
  const { orders, loaded } = useOrders();
  const delivered = useDeliveredProductIds();
  const mine = useMyReviews();

  const order = orderId ? orders.find((o) => o.id === orderId) : undefined;
  const ids = order
    ? [...new Set(order.items.filter((i) => i.productId).map((i) => REMOTE_PREFIX + i.productId))]
    : product
      ? [product]
      : [];
  // Only products still in the store, and only ones this customer has received.
  const items = ids.map((id) => findProduct(id)).filter((p): p is Product => !!p && delivered.has(p.id));

  return (
    <Screen>
      <ScreenHeader variant="tint" title={order ? 'Rate your items' : 'Rate this product'} subtitle={order ? `Order #${order.no}` : 'Your rating helps other shoppers'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 14, paddingBottom: pad.bottom(30), gap: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}>
          {!loaded && items.length === 0 ? (
            <ActivityIndicator color={C.green} style={{ marginTop: 60 }} />
          ) : items.length === 0 ? (
            <Txt style={[f(400, 12.5, 1.5), { color: C.muted, textAlign: 'center', paddingVertical: 60, paddingHorizontal: 20 }]}>
              You can rate products once your order with them has been delivered.
            </Txt>
          ) : (
            items.map((p) => <RateCard key={p.id + (mine[p.id] ? ':r' : '')} p={p} existing={mine[p.id]} />)
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
