import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** False until `.env` has the project URL and publishable key. */
export const isSupabaseConfigured = !!url && !!key;

if (!isSupabaseConfigured && __DEV__) {
  console.warn('Supabase is not configured: add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env and restart Expo.');
}

/**
 * Shared Supabase client. Sessions persist in expo-sqlite's localStorage so a signed-in user
 * stays signed in across launches (auth itself is wired up later).
 */
export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-key', {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Only refresh auth tokens while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

/**
 * Dev helper: pings the project's REST endpoint with the publishable key. Resolves to a short
 * status message; useful to confirm the keys are right before any tables exist.
 */
export async function checkSupabaseConnection(): Promise<string> {
  if (!isSupabaseConfigured) return 'Supabase: not configured';
  try {
    // /auth/v1/settings rejects an invalid key (401), unlike /health, so this validates both URL and key.
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key! } });
    return res.ok ? 'Supabase: connected' : `Supabase: responded ${res.status} (check the URL and key)`;
  } catch {
    return 'Supabase: unreachable (check the URL / network)';
  }
}
