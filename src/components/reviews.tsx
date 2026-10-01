import { router } from 'expo-router';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Tap, Txt } from '@/components/ui/primitives';
import { C, f } from '@/constants/theme';
import type { Product } from '@/data/catalog';
import { useDeliveredProductIds, useMyReviews, useProductReviews, type Review } from '@/lib/remote-reviews';

const STAR = 'M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z';
const GOLD = '#F2A900';

export function Star({ size = 14, on = true }: { size?: number; on?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR} fill={on ? GOLD : '#E4E4DF'} />
    </Svg>
  );
}

/** Read-only row of 5 stars (rounded to the nearest whole star). */
export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }} accessibilityLabel={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} on={n <= Math.round(value)} />
      ))}
    </View>
  );
}

const LABELS = ['', 'Poor', 'Below average', 'Okay', 'Good', 'Excellent'];

/** Tap-to-rate 1–5 stars. */
export function StarPicker({ value, onChange, size = 34 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Tap
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
            accessibilityState={{ selected: n === value }}
            onPress={() => onChange(n)}
            hitSlop={4}
            pressedStyle={{ opacity: 0.6 }}>
            <Star size={size} on={n <= value} />
          </Tap>
        ))}
      </View>
      <Txt style={[f(600, 12, 1.2), { color: value ? C.ink2 : C.muted }]}>{value ? LABELS[value] : 'Tap a star to rate'}</Txt>
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

function ReviewItem({ r }: { r: Review }) {
  return (
    <View style={{ gap: 6, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.dividerSoft }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Stars value={r.rating} />
        <Txt numberOfLines={1} style={[f(600, 11.5, 1.2), { color: C.ink2, flexShrink: 1 }]}>
          {r.mine ? 'Your review' : r.author}
        </Txt>
        <Txt style={[f(400, 10.5, 1.2), { color: C.muted, marginLeft: 'auto' }]}>{shortDate(r.createdAt)}</Txt>
      </View>
      {r.mine && r.status !== 'published' && (
        <Txt style={[f(500, 10.5, 1.3), { color: '#8A6100' }]}>
          {r.status === 'pending' ? 'Waiting for approval · only you can see it' : 'Hidden by Spice Kart · only you can see it'}
        </Txt>
      )}
      {r.comment.trim() !== '' && <Txt style={[f(400, 12.5, 1.5), { color: C.ink2 }]}>{r.comment}</Txt>}
      {r.reply && (
        <View style={{ marginTop: 2, padding: 10, borderRadius: 8, backgroundColor: '#F7FAF2', gap: 3 }}>
          <Txt style={[f(600, 11, 1.2), { color: C.green }]}>Reply from Spice Kart</Txt>
          <Txt style={[f(400, 12, 1.45), { color: C.ink2 }]}>{r.reply}</Txt>
        </View>
      )}
    </View>
  );
}

/** "Ratings & reviews" on the product page: average, a rate/edit button for buyers, and the reviews. */
export function ReviewsSection({ prod }: { prod: Product }) {
  const { reviews, loaded } = useProductReviews(prod.id);
  const delivered = useDeliveredProductIds();
  const mine = useMyReviews()[prod.id];
  const canRate = delivered.has(prod.id);

  return (
    <View style={{ gap: 10 }}>
      <Txt style={f(700, 14, 1)}>Ratings & reviews</Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.borderSoft }}>
        {prod.reviewCount > 0 ? (
          <>
            <Txt style={f(700, 26, 1)}>{prod.rating.toFixed(1)}</Txt>
            <View style={{ gap: 4 }}>
              <Stars value={prod.rating} size={14} />
              <Txt style={[f(400, 11, 1.2), { color: C.muted }]}>
                {prod.reviewCount} rating{prod.reviewCount === 1 ? '' : 's'}
              </Txt>
            </View>
          </>
        ) : (
          <Txt style={[f(400, 12, 1.4), { color: C.muted, flex: 1 }]}>No ratings yet</Txt>
        )}
        {canRate && (
          <Tap
            onPress={() => router.push({ pathname: '/rate', params: { product: prod.id } })}
            pressedStyle={{ backgroundColor: C.limeHover }}
            style={{ marginLeft: 'auto', height: 34, paddingHorizontal: 13, borderRadius: 8, backgroundColor: C.lime, justifyContent: 'center' }}>
            <Txt style={[f(700, 12, 1), { color: C.forest }]}>{mine ? 'Edit your review' : 'Rate this product'}</Txt>
          </Tap>
        )}
      </View>
      {!canRate && (
        <Txt style={[f(400, 11, 1.4), { color: C.muted }]}>Only customers who’ve received this product can rate it.</Txt>
      )}
      {loaded && reviews.length > 0 && (
        <View>
          {reviews.map((r) => (
            <ReviewItem key={r.id} r={r} />
          ))}
        </View>
      )}
    </View>
  );
}
