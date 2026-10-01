import { useEffect, useState } from 'react';
import { create } from 'zustand';

import { REMOTE_PREFIX } from '@/data/catalog';
import { singleFlight } from '@/lib/live-changes';
import { refreshCatalog, useCatalogVersion } from '@/lib/remote-catalog';
import { useOrders } from '@/lib/remote-orders';
import { ensureUserId } from '@/lib/remote-profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useApp } from '@/store/app-store';

// Product reviews live in the admin panel's `public.reviews`. Customers write them only through
// the `submit_review` RPC, which needs a delivered order containing the product (reviews migration).

export type ReviewStatus = 'pending' | 'published' | 'hidden';

export type Review = {
  id: string;
  rating: number;
  comment: string;
  reply: string | null;
  createdAt: string;
  status: ReviewStatus;
  /** "Riya S." */
  author: string;
  mine: boolean;
};

export type MyReview = { rating: number; comment: string; status: ReviewStatus };

type ReviewRow = {
  id: string;
  rating: number;
  comment: string;
  reply: string | null;
  created_at: string;
  status: ReviewStatus;
  author: string;
  mine: boolean;
};

const dbId = (id: string) => (id.startsWith(REMOTE_PREFIX) ? id.slice(REMOTE_PREFIX.length) : null);

/**
 * Published reviews for one product (newest first), with the signed-in customer's own review on
 * top whatever its status. Re-fetched whenever the catalogue reloads, which a review change triggers.
 */
export function useProductReviews(productId: string) {
  const version = useCatalogVersion((s) => s.version);
  const signedIn = useApp((s) => s.signedIn);
  const [state, setState] = useState<{ reviews: Review[]; loaded: boolean }>({ reviews: [], loaded: false });

  useEffect(() => {
    const id = dbId(productId);
    if (!isSupabaseConfigured || !id) return;
    let alive = true;
    supabase.rpc('product_reviews', { p_product: id, p_limit: 20 }).then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        if (__DEV__) console.warn('Could not load reviews:', error.message);
        setState((s) => ({ ...s, loaded: true }));
        return;
      }
      setState({
        reviews: (data as ReviewRow[]).map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          reply: r.reply,
          createdAt: r.created_at,
          status: r.status,
          author: r.author,
          mine: r.mine,
        })),
        loaded: true,
      });
    });
    return () => {
      alive = false;
    };
  }, [productId, version, signedIn]);

  return state;
}

/** This customer's reviews, keyed by catalogue product id. */
export const useMyReviewStore = create<{ byProduct: Record<string, MyReview> }>(() => ({ byProduct: {} }));

const loadMyReviews = singleFlight(async () => {
  if (!useApp.getState().signedIn) {
    useMyReviewStore.setState({ byProduct: {} });
    return;
  }
  try {
    const uid = await ensureUserId();
    const { data, error } = await supabase
      .from('reviews')
      .select('product_id, rating, comment, status, created_at')
      .eq('customer_id', uid)
      .not('product_id', 'is', null)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const byProduct: Record<string, MyReview> = {};
    // Ascending, so the latest review per product wins.
    for (const r of data as { product_id: string; rating: number; comment: string; status: ReviewStatus }[]) {
      byProduct[REMOTE_PREFIX + r.product_id] = { rating: r.rating, comment: r.comment, status: r.status };
    }
    useMyReviewStore.setState({ byProduct });
  } catch (e) {
    if (__DEV__) console.warn('Could not load your reviews:', (e as Error).message);
  }
});

/** This customer's reviews; loads when the calling screen mounts. */
export function useMyReviews() {
  const signedIn = useApp((s) => s.signedIn);
  useEffect(() => {
    if (isSupabaseConfigured) loadMyReviews();
  }, [signedIn]);
  return useMyReviewStore((s) => s.byProduct);
}

/** Catalogue ids of products this customer has received (in a delivered order), so they can rate them. */
export function useDeliveredProductIds(): Set<string> {
  const { orders } = useOrders();
  const ids = new Set<string>();
  for (const o of orders) {
    if (o.status !== 'delivered') continue;
    for (const i of o.items) if (i.productId) ids.add(REMOTE_PREFIX + i.productId);
  }
  return ids;
}

const ERRORS: Record<string, string> = {
  not_signed_in: 'Please log in to rate products',
  not_delivered: 'You can rate this once your order with it is delivered',
  invalid_rating: 'Choose 1 to 5 stars',
  comment_too_long: 'Your review is too long (1000 characters max)',
};

/** Save (or edit) this customer's rating for a product. Resolves with its moderation status. */
export async function submitReview(productId: string, rating: number, comment: string): Promise<ReviewStatus> {
  const id = dbId(productId);
  if (!id) throw new Error('This product can’t be rated');
  await ensureUserId();
  const { data, error } = await supabase.rpc('submit_review', { p_product: id, p_rating: rating, p_comment: comment.trim() });
  if (error) {
    if (__DEV__) console.warn('Could not save review:', error.message);
    throw new Error(ERRORS[error.message] ?? 'Couldn’t save your review. Check your connection and try again.');
  }
  const status = (data as { status: ReviewStatus }).status;
  useMyReviewStore.setState((s) => ({ byProduct: { ...s.byProduct, [productId]: { rating, comment: comment.trim(), status } } }));
  // New average on the product page (Realtime also does this when `app_changes` is set up).
  refreshCatalog();
  return status;
}
