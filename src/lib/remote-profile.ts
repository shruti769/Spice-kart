import { File } from 'expo-file-system';

import { singleFlight } from '@/lib/live-changes';
import { isSupabaseConfigured, supabase, supabaseKey, supabaseUrl } from '@/lib/supabase';
import { useApp, type User } from '@/store/app-store';

// Personal details live in `public.profiles` (one row per Supabase Auth user) and the profile
// photo in the public `avatars` bucket under `<uid>/`. Until SMS OTP is wired to Supabase Auth,
// each signed-in device gets an anonymous Supabase user.

const COLUMNS = 'first_name, last_name, email, mobile, dob, avatar_url';
const BUCKET = 'avatars';

type Row = { first_name: string; last_name: string; email: string; mobile: string; dob: string | null; avatar_url: string | null };

/** "14 / 03 / 1994" → "1994-03-14" (null when empty). */
function toDbDob(dob: string) {
  const m = dob.match(/^(\d{2}) \/ (\d{2}) \/ (\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** "1994-03-14" → "14 / 03 / 1994". */
function fromDbDob(dob: string | null) {
  const m = dob?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]} / ${m[2]} / ${m[1]}` : '';
}

const fromRow = (r: Row): User => ({
  first: r.first_name,
  last: r.last_name,
  email: r.email,
  mobile: r.mobile,
  dob: fromDbDob(r.dob),
  avatar: r.avatar_url ?? undefined,
});

const trace = (step: string) => {
  if (__DEV__) console.log('[profile]', step);
};

/** Reject if `p` hasn't settled within `ms`, so a stuck request can't leave Save spinning forever. */
function withTimeout<T>(p: PromiseLike<T>, ms: number, step: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${step} timed out after ${ms / 1000}s`)), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

let signingIn: Promise<string> | null = null;

/** The Supabase user id for this device, signing in anonymously the first time. */
export function ensureUserId(): Promise<string> {
  signingIn ??= (async () => {
    trace('get session');
    const { data } = await withTimeout(supabase.auth.getSession(), 10_000, 'Getting the session');
    if (data.session) return data.session.user.id;
    trace('anonymous sign-in');
    const res = await withTimeout(supabase.auth.signInAnonymously(), 15_000, 'Anonymous sign-in');
    if (res.error || !res.data.user) throw res.error ?? new Error('Anonymous sign-in failed');
    return res.data.user.id;
  })().finally(() => {
    signingIn = null;
  });
  return signingIn;
}

/** Storage path of a photo in our bucket, from its public URL. */
const avatarPath = (url?: string) => url?.split(`/object/public/${BUCKET}/`)[1]?.split('?')[0];

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic' };

/**
 * Run a Supabase request, retrying once: iOS can fail a request on a stale pooled connection
 * ("The network connection was lost"). Only for idempotent writes.
 */
async function withRetry(step: string, ms: number, run: () => PromiseLike<{ error: Error | null }>) {
  const attempt = () => withTimeout(run(), ms, step).then(({ error }) => error, (e: Error) => e);
  trace(step);
  let error = await attempt();
  if (error) {
    trace(`${step} failed (${error.message}), retrying`);
    await new Promise((r) => setTimeout(r, 600));
    error = await attempt();
  }
  if (error) throw error;
}

/**
 * Upload a picked (local) photo into `bucket` under `<uid>/` and return its storage path.
 * Shared by profile photos and support chat photos.
 */
export async function uploadPhoto(bucket: string, uid: string, uri: string) {
  const raw = uri.split('?')[0].split('.').pop()?.toLowerCase() ?? '';
  const ext = MIME[raw] ? (raw === 'jpeg' ? 'jpg' : raw) : 'jpg';
  // A new name per upload, so image caches never show the old photo.
  const path = `${uid}/${Date.now()}.${ext}`;
  const { data } = await withTimeout(supabase.auth.getSession(), 10_000, 'Getting the session');
  const token = data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  const file = new File(uri);
  trace(`upload photo (${Math.round((file.size ?? 0) / 1024)} KB)`);
  // Uploaded natively (URLSession upload task) rather than through supabase-js: Expo's `fetch`
  // never finishes a POST with a binary body to Storage on iOS. upsert: a retry after a lost
  // response must not fail with "already exists".
  await withRetry('Uploading the photo', 45_000, async () => {
    const res = await file.upload(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
      httpMethod: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey, 'Content-Type': MIME[ext], 'x-upsert': 'true', 'Cache-Control': 'max-age=3600' },
    });
    if (res.status >= 200 && res.status < 300) return { error: null };
    let message = `Upload failed (${res.status})`;
    try {
      message = JSON.parse(res.body).message ?? message;
    } catch {}
    return { error: new Error(message) };
  });
  return path;
}

/** Upload a picked (local) profile photo and return its public URL. */
async function uploadAvatar(uid: string, uri: string) {
  const path = await uploadPhoto(BUCKET, uid, uri);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Save personal details to Supabase (uploading a newly picked photo first) and return the user as
 * stored, with `avatar` as its public URL. Local-only when Supabase isn't configured.
 */
export async function saveProfile(user: User): Promise<User> {
  if (!isSupabaseConfigured) return user;
  const uid = await ensureUserId();
  const previous = useApp.getState().user.avatar;
  const avatar = user.avatar && !/^https?:/.test(user.avatar) ? await uploadAvatar(uid, user.avatar) : user.avatar;
  await withRetry('Saving the profile', 15_000, () =>
    supabase.from('profiles').upsert({
      id: uid,
      first_name: user.first,
      last_name: user.last,
      email: user.email,
      mobile: user.mobile,
      dob: toDbDob(user.dob),
      avatar_url: avatar ?? null,
    }),
  );
  // The admin panel's Customers list reads `public.customers` (same id).
  await withRetry('Saving the customer', 15_000, () =>
    supabase.from('customers').upsert({
      id: uid,
      first_name: user.first.slice(0, 60),
      last_name: user.last.slice(0, 60),
      email: user.email || null,
      mobile: user.mobile || null,
    }),
  );
  // Best effort: drop the replaced photo.
  const old = avatarPath(previous);
  if (old && previous !== avatar) supabase.storage.from(BUCKET).remove([old]).catch(() => {});
  trace('saved');
  return { ...user, avatar };
}

/** Load the saved profile into the app; creates the row (with the verified mobile) on first sign-in. */
const loadProfile = singleFlight(async () => {
  try {
    const uid = await ensureUserId();
    const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', uid).maybeSingle();
    if (error) throw error;
    const state = useApp.getState();
    if (!state.signedIn) return;
    if (data) {
      state.set({ user: fromRow(data as Row) });
      return;
    }
    const mobile = state.phone || state.user.mobile;
    // ignoreDuplicates: never overwrite details saved meanwhile (e.g. from the sign-up step).
    const res = await supabase.from('profiles').upsert({ id: uid, mobile: /^\d{9}$/.test(mobile) ? mobile : '' }, { ignoreDuplicates: true });
    if (res.error) throw res.error;
  } catch (e) {
    if (__DEV__) console.warn('Could not load profile:', (e as Error).message);
  }
});

let started = false;

/** Sync the profile whenever the user signs in (or launches signed in); sign out of Supabase on log out. */
export function startRemoteProfile() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  // Also fires when the saved state is restored on launch (signedIn goes false → true).
  useApp.subscribe((s, prev) => {
    if (s.signedIn && !prev.signedIn) loadProfile();
    if (!s.signedIn && prev.signedIn) supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  });
  if (useApp.persist.hasHydrated() && useApp.getState().signedIn) loadProfile();
}
