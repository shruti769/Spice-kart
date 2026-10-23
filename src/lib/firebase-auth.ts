import { Platform } from 'react-native';
import type { ConfirmationResult } from '@react-native-firebase/auth';

import { isSupabaseConfigured, supabase, supabaseKey, supabaseUrl } from '@/lib/supabase';

let confirmation: ConfirmationResult | null = null;
let pendingPhone = '';

// Load native modules only when used, so web and Expo Go can still render the app.
async function sdk() {
  if (Platform.OS === 'web') throw new Error('Phone sign-in is available in the Android and iOS app.');
  try {
    const auth = await import('@react-native-firebase/auth');
    auth.getAuth();
    return auth;
  } catch {
    throw new Error('Firebase is unavailable. Install a development build with Firebase configuration.');
  }
}

export async function sendPhoneOtp(phone: string) {
  const auth = await sdk();
  confirmation = null;
  pendingPhone = '';
  const result = await auth.signInWithPhoneNumber(auth.getAuth(), phone);
  confirmation = result;
  pendingPhone = phone;
}

export async function verifyPhoneOtp(phone: string, code: string) {
  const auth = await sdk();
  // Android may verify the SMS automatically before the user enters it.
  if (auth.getAuth().currentUser?.phoneNumber === phone) return;
  if (!confirmation || pendingPhone !== phone) throw new Error('Request a new code from the login screen.');
  const result = await confirmation.confirm(code);
  if (!result?.user || result.user.phoneNumber !== phone) throw new Error('Phone verification failed. Request a new code.');
  confirmation = null;
  pendingPhone = '';
}

export async function restorePhoneSession(): Promise<boolean> {
  try {
    const auth = await sdk();
    return await new Promise<boolean>((resolve) => {
      const unsubscribe = auth.onAuthStateChanged(auth.getAuth(), (user) => {
        unsubscribe();
        resolve(!!user?.phoneNumber);
      });
    });
  } catch {
    return false;
  }
}

export async function signOutPhone() {
  const auth = await sdk();
  await auth.signOut(auth.getAuth());
  confirmation = null;
  pendingPhone = '';
}

export function phoneAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-verification-code': return 'Incorrect code. Please try again.';
    case 'auth/code-expired':
    case 'auth/session-expired': return 'Code expired. Please request a new code.';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed': return 'Check your internet connection and try again.';
    case 'auth/invalid-phone-number': return 'Enter a valid mobile number for the selected country.';
    case 'auth/billing-not-enabled': return 'SMS sign-in is unavailable until billing is enabled. Please contact support.';
    case 'auth/operation-not-allowed': return 'Phone sign-in is currently unavailable. Please contact support.';
    case 'auth/app-not-authorized':
    case 'auth/invalid-app-credential': return 'This app could not be verified. Please install the latest version.';
    case 'auth/quota-exceeded': return 'SMS limit reached. Please try again later.';
    default: return code ? 'Could not complete phone verification. Please try again.' : error instanceof Error ? error.message : 'Phone verification failed.';
  }
}

/** Includes Android automatic verification while the OTP screen is visible. */
export async function watchVerifiedPhone(phone: string, onVerified: () => void) {
  const auth = await sdk();
  return auth.onAuthStateChanged(auth.getAuth(), (user) => {
    if (user?.phoneNumber === phone) onVerified();
  });
}

let backendSession: Promise<string> | null = null;

/** Exchange a signed Firebase identity for the UUID account used by existing Supabase RLS. */
export function ensureBackendSession(): Promise<string> {
  backendSession ??= (async () => {
    if (!isSupabaseConfigured) throw new Error('Account service is not configured. Please contact support.');
    const auth = await sdk();
    const user = auth.getAuth().currentUser;
    if (!user?.phoneNumber) throw new Error('Verify your phone number before continuing.');
    const { data: stored } = await supabase.auth.getSession();
    if (stored.session && !stored.session.user.is_anonymous &&
        stored.session.user.app_metadata.firebase_uid === user.uid &&
        (stored.session.expires_at ?? 0) > Date.now() / 1000 + 60) {
      return stored.session.user.id;
    }
    const token = await auth.getIdToken(user);
    const response = await fetch(`${supabaseUrl}/functions/v1/firebase-session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: supabaseKey },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error('Could not connect your account. Please try again or contact support.');
    const tokens = await response.json();
    if (typeof tokens.access_token !== 'string' || typeof tokens.refresh_token !== 'string') {
      throw new Error('Account service returned an invalid session.');
    }
    // The user could have logged out or switched accounts during the network request.
    if (auth.getAuth().currentUser?.uid !== user.uid) throw new Error('Sign-in changed. Please retry.');
    const { data, error } = await supabase.auth.setSession(tokens);
    if (error || !data.user || data.user.app_metadata.firebase_uid !== user.uid) {
      await supabase.auth.signOut({ scope: 'local' });
      throw new Error('Account verification failed. Please sign in again.');
    }
    return data.user.id;
  })().finally(() => { backendSession = null; });
  return backendSession;
}
