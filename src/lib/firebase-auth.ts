import { Platform } from 'react-native';
import type { AuthCredential, ConfirmationResult } from '@react-native-firebase/auth';

import { isSupabaseConfigured, supabase, supabaseKey, supabaseUrl } from '@/lib/supabase';

let confirmation: ConfirmationResult | null = null;
let pendingPhone = '';

export type SocialProvider = 'Google' | 'Apple';
type SocialProfile = { first: string; last: string; email: string };

// A Google / Apple sign-in whose account has no verified mobile yet. The customer verifies their
// phone with the normal OTP flow, then linkPendingSocial() attaches this credential to that
// (phone) account, so the Supabase account is always keyed by a verified mobile.
let pendingSocial: { credential: AuthCredential; provider: SocialProvider } | null = null;
let socialProfile: SocialProfile | null = null;

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

/** Name and email shared by Google / Apple, to prefill the sign-up form. */
export const socialSignUpProfile = () => socialProfile;

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
  pendingSocial = null;
  socialProfile = null;
  // Let the next Google sign-in offer the account picker again.
  if (googleWebClientId) import('@react-native-google-signin/google-signin').then((g) => g.GoogleSignin.signOut()).catch(() => {});
}

/** The signed-in Firebase user's verified mobile ('' when there is none). */
export async function verifiedPhone() {
  const auth = await sdk();
  return auth.getAuth().currentUser?.phoneNumber ?? '';
}

/** 'signed_in': the account already has a verified mobile. 'needs_phone': verify it with the OTP flow next. */
export type SocialResult = 'signed_in' | 'needs_phone' | 'cancelled';

async function socialSignIn(credential: AuthCredential, provider: SocialProvider, profile: SocialProfile): Promise<SocialResult> {
  const auth = await sdk();
  const { user } = await auth.signInWithCredential(auth.getAuth(), credential);
  if (user.phoneNumber) return 'signed_in';
  // A new sign-in without a mobile: drop the empty account; the credential is linked after the OTP.
  await auth.deleteUser(user).catch(() => auth.signOut(auth.getAuth()));
  pendingSocial = { credential, provider };
  socialProfile = profile;
  return 'needs_phone';
}

export async function signInWithGoogle(): Promise<SocialResult> {
  const auth = await sdk();
  if (!googleWebClientId) throw new Error('Google sign-in isn’t set up yet. Please use your phone number.');
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = await import('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: googleWebClientId });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return 'cancelled';
    const { idToken, user } = response.data;
    if (!idToken) throw new Error('Google didn’t return a sign-in token. Please try again.');
    return await socialSignIn(auth.GoogleAuthProvider.credential(idToken), 'Google', {
      first: user.givenName ?? '',
      last: user.familyName ?? '',
      email: user.email,
    });
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.IN_PROGRESS) return 'cancelled';
    throw error;
  }
}

export async function signInWithApple(): Promise<SocialResult> {
  const auth = await sdk();
  const Apple = await import('expo-apple-authentication');
  const Crypto = await import('expo-crypto');
  if (!(await Apple.isAvailableAsync())) throw new Error('Sign in with Apple isn’t available on this device.');
  // Apple signs the SHA-256 of the nonce; Firebase checks it against the raw value.
  const rawNonce = Crypto.randomUUID();
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let apple;
  try {
    apple = await Apple.signInAsync({
      requestedScopes: [Apple.AppleAuthenticationScope.FULL_NAME, Apple.AppleAuthenticationScope.EMAIL],
      nonce,
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return 'cancelled';
    throw error;
  }
  if (!apple.identityToken) throw new Error('Apple didn’t return a sign-in token. Please try again.');
  // Apple shares the name and email only on the first sign-in.
  const credential = new auth.OAuthProvider('apple.com').credential({ idToken: apple.identityToken, rawNonce });
  return socialSignIn(credential, 'Apple', {
    first: apple.fullName?.givenName ?? '',
    last: apple.fullName?.familyName ?? '',
    email: apple.email ?? '',
  });
}

/**
 * After the phone OTP: attach the Google / Apple sign-in waiting for it, so either signs in to this
 * account next time. Resolves with a message when it couldn't be linked (the phone login still works).
 */
export async function linkPendingSocial(): Promise<string | null> {
  if (!pendingSocial) return null;
  const { credential, provider } = pendingSocial;
  pendingSocial = null;
  const auth = await sdk();
  const user = auth.getAuth().currentUser;
  if (!user) return null;
  try {
    await auth.linkWithCredential(user, credential);
    return null;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/provider-already-linked' || code === 'auth/credential-already-in-use') {
      return `This mobile is already connected to another ${provider} account · sign in with your phone number`;
    }
    return `Couldn’t connect ${provider} · you can keep signing in with your phone number`;
  }
}

export function socialAuthError(provider: SocialProvider, error: unknown): string {
  switch ((error as { code?: string })?.code) {
    case 'auth/account-exists-with-different-credential':
      return 'This email already uses another sign-in method. Please use your phone number.';
    case 'auth/operation-not-allowed':
      return `${provider} sign-in isn’t switched on yet. Please use your phone number.`;
    default:
      return phoneAuthError(error);
  }
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
