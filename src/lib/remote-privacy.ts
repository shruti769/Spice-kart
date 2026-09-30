import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Alert, Linking, Platform } from 'react-native';

import { findCategory } from '@/data/catalog';
import { goTab, openCategory } from '@/lib/nav';
import { ensureUserId } from '@/lib/remote-profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useApp, whenHydrated } from '@/store/app-store';

// Profile → Privacy & data, on the server:
// - Push notifications / Email updates / Marketing & offers are the customer's `push_opt_in`,
//   `email_opt_in` and `marketing_opt_in` (the admin's send-push and order emails read them).
// - This phone's Expo push token lives in `push_tokens` while push is on.
// See the privacy migration and the admin's supabase/notifications.sql.

type ServerPref = 'push' | 'email' | 'marketing';
const COLUMN: Record<ServerPref, 'push_opt_in' | 'email_opt_in' | 'marketing_opt_in'> = {
  push: 'push_opt_in',
  email: 'email_opt_in',
  marketing: 'marketing_opt_in',
};
const DEFAULTS: Record<ServerPref, boolean> = { push: true, email: true, marketing: false };

const pref = (k: ServerPref) => useApp.getState().prefs[k] ?? DEFAULTS[k];

// ─── Opt-ins ──────────────────────────────────────────────────────────────────────────────

/** Load the saved opt-ins after sign-in (creating the customer row the first time). */
async function loadOptIns() {
  try {
    const uid = await ensureUserId();
    await supabase.from('customers').upsert({ id: uid }, { onConflict: 'id', ignoreDuplicates: true });
    const { data, error } = await supabase.from('customers').select('push_opt_in, email_opt_in, marketing_opt_in').eq('id', uid).maybeSingle();
    if (error) throw error;
    if (!data || !useApp.getState().signedIn) return;
    const prefs = useApp.getState().prefs;
    useApp.getState().set({
      prefs: { ...prefs, push: data.push_opt_in, email: data.email_opt_in ?? true, marketing: data.marketing_opt_in },
    });
  } catch (e) {
    if (__DEV__) console.warn('Could not load notification settings:', (e as Error).message);
  }
}

async function saveOptIn(k: ServerPref, on: boolean) {
  try {
    const uid = await ensureUserId();
    const { error } = await supabase.from('customers').update({ [COLUMN[k]]: on }).eq('id', uid);
    if (error) throw error;
  } catch (e) {
    if (__DEV__) console.warn('Could not save ' + k + ' setting:', (e as Error).message);
  }
}

// ─── Push ─────────────────────────────────────────────────────────────────────────────────

// Show pushes that arrive while the app is open, too.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** This phone's registered token, so turning push off (or logging out) can remove it. */
let pushToken: string | null = null;

export type PushResult = 'ok' | 'denied' | 'unsupported' | 'failed';

/**
 * Register this phone for push. `ask` shows the system prompt when the user hasn't answered it
 * yet. Needs a real device and a development / store build (not Expo Go on Android).
 */
export async function registerPush({ ask }: { ask: boolean }): Promise<PushResult> {
  if (!isSupabaseConfigured || Platform.OS === 'web' || !Device.isDevice) return 'unsupported';
  try {
    if (Platform.OS === 'android') {
      // send-push uses 'orders' for order updates and 'default' for everything else.
      await Notifications.setNotificationChannelAsync('orders', { name: 'Order updates', importance: Notifications.AndroidImportance.HIGH });
      await Notifications.setNotificationChannelAsync('default', { name: 'Offers and news', importance: Notifications.AndroidImportance.DEFAULT });
    }
    let perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && ask && perm.canAskAgain) perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return 'denied';

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
    if (error) throw error;
    pushToken = token;
    return 'ok';
  } catch (e) {
    if (__DEV__) console.warn('Could not register for push:', (e as Error).message);
    return 'failed';
  }
}

/** Stop pushes to this phone. */
export async function unregisterPush() {
  const token = pushToken;
  pushToken = null;
  if (!token) return;
  const { error } = await supabase.from('push_tokens').delete().eq('token', token);
  if (error && __DEV__) console.warn('Could not remove push token:', error.message);
}

/** Where a tapped notification goes (`link` from the admin: order:, support:, category:, page:). */
function openLink(link: unknown) {
  const [kind, value = ''] = typeof link === 'string' ? link.split(/:(.*)/s) : [];
  switch (kind) {
    case 'order':
      router.push({ pathname: '/track', params: { id: value } });
      return;
    case 'support':
      router.push({ pathname: '/support/chat', params: { ticket: value } });
      return;
    case 'category':
      if (findCategory(value)) openCategory(value);
      else goTab('categories');
      return;
    case 'page':
      if (value === 'Offers page') router.push('/offers');
      else if (value === 'Orders') goTab('orders');
      else if (value === 'Wallet') router.push('/money');
      else if (value === 'Cart') router.push('/cart');
      else goTab('home');
      return;
  }
}

let lastHandled: string | null = null;

/** Open what a tapped notification points to (once per notification, only when signed in). */
export async function handleNotificationTap(response: Notifications.NotificationResponse | null | undefined) {
  if (!response) return;
  const id = response.notification.request.identifier;
  if (id === lastHandled) return;
  lastHandled = id;
  // On a cold start, wait for the saved sign-in and the launch screen's redirect first.
  await whenHydrated();
  await new Promise((r) => setTimeout(r, 400));
  if (!useApp.getState().signedIn) return;
  const data = response.notification.request.content.data as { notificationId?: number; link?: unknown } | undefined;
  openLink(data?.link);
  // Marks it opened in the customer's inbox (the admin's campaign stats read it).
  if (typeof data?.notificationId === 'number') {
    const now = new Date().toISOString();
    supabase.from('customer_notifications').update({ read_at: now, opened_at: now }).eq('id', data.notificationId).then(() => {});
  }
}

// ─── Toggles ──────────────────────────────────────────────────────────────────────────────

/**
 * Privacy & data toggles that change something outside the phone. Push asks for permission
 * first and stays off if the user says no.
 */
export async function setServerPref(k: ServerPref, on: boolean) {
  const { set, flash } = useApp.getState();
  if (k === 'push' && on) {
    const r = await registerPush({ ask: true });
    if (r === 'denied') {
      Alert.alert('Notifications are off for Spice Kart', 'Allow notifications in Settings to get order updates.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    if (r === 'unsupported') flash('Push works on a phone with the Spice Kart app installed');
  }
  set({ prefs: { ...useApp.getState().prefs, [k]: on } });
  if (k === 'push' && !on) unregisterPush();
  await saveOptIn(k, on);
}

// ─── Your data ────────────────────────────────────────────────────────────────────────────

const DATA_ERRORS: Record<string, string> = {
  no_email: 'Add an email in Personal details to receive your data',
  already_requested: 'Already requested today · check your email',
};

/** Download personal data: the server emails a copy to the address in Personal details. */
export async function requestMyData(): Promise<string> {
  if (!isSupabaseConfigured) return 'Couldn’t request your data. Please try again';
  try {
    await ensureUserId();
    const { error } = await supabase.rpc('request_my_data');
    if (!error) return 'We’ll email a copy to ' + useApp.getState().user.email.trim() + ' shortly';
    const code = Object.keys(DATA_ERRORS).find((k) => error.message.includes(k));
    return code ? DATA_ERRORS[code] : 'Couldn’t request your data. Please try again';
  } catch {
    return 'Couldn’t request your data. Please try again';
  }
}

/** Remove every file this user uploaded to `bucket` (their `<uid>/` folder). */
async function removeFolder(bucket: string, uid: string) {
  const { data } = await supabase.storage.from(bucket).list(uid, { limit: 1000 });
  if (data?.length) await supabase.storage.from(bucket).remove(data.map((f) => `${uid}/${f.name}`));
}

/**
 * Delete account: photos, this phone's push token, then the account and everything tied to it on
 * the server, then log out. Returns an error message, or null when it's gone.
 */
export async function deleteMyAccount(): Promise<string | null> {
  if (!isSupabaseConfigured) return 'Couldn’t delete your account. Please try again';
  try {
    const uid = await ensureUserId();
    // Refuse before touching anything if an order is still on its way.
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '(delivered,cancelled)');
    if (count) return 'You have an order on its way. Delete your account once it’s delivered';
    await Promise.all([removeFolder('avatars', uid), removeFolder('support-photos', uid)]).catch(() => {});
    await unregisterPush();
    const { error } = await supabase.rpc('delete_my_account');
    if (error) {
      if (error.message.includes('active_order')) return 'You have an order on its way. Delete your account once it’s delivered';
      throw error;
    }
    useApp.getState().restart();
    // Unlike log out, nothing of the account stays on the phone.
    useApp.getState().set({ recentTerms: [], viewedIds: [] });
    return null;
  } catch (e) {
    if (__DEV__) console.warn('Could not delete account:', (e as Error).message);
    return 'Couldn’t delete your account. Please try again';
  }
}

/** Log out: stop pushes to this phone first (needs the session), then forget the account. */
export async function logOut() {
  await Promise.race([unregisterPush(), new Promise((r) => setTimeout(r, 3000))]);
  useApp.getState().restart();
}

let started = false;

/** Sync the opt-ins and this phone's push token with the signed-in account. */
export function startRemotePrivacy() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  useApp.subscribe((s, prev) => {
    if (s.signedIn && !prev.signedIn) {
      // After a fresh sign-in the saved server opt-ins win; then ask for push once if it's on.
      loadOptIns().then(() => {
        if (pref('push')) registerPush({ ask: true });
      });
    }
    if (!s.signedIn && prev.signedIn) pushToken = null;
  });
  if (useApp.persist.hasHydrated() && useApp.getState().signedIn) {
    loadOptIns().then(() => {
      if (pref('push')) registerPush({ ask: false });
    });
  }
}
