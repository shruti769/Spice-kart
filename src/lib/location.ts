import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

// Foreground ("while using the app") location only: a single fix when asked, never tracking.

export type Coords = { lat: number; lng: number };
export type DeviceFix = Coords & { accuracy: number | null; at: string };

export type FixResult =
  | { ok: true; fix: DeviceFix }
  /** denied: the user said no (canAskAgain false = only Settings can change it) · off: location services are disabled. */
  | { ok: false; reason: 'denied' | 'off' | 'unavailable'; canAskAgain?: boolean };

const toFix = (l: Location.LocationObject): DeviceFix => ({
  lat: l.coords.latitude,
  lng: l.coords.longitude,
  accuracy: l.coords.accuracy ?? null,
  at: new Date(l.timestamp).toISOString(),
});

function timeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
}

/**
 * The phone's current position. `ask` shows the system permission prompt when the user hasn't
 * answered it yet. Falls back to the last known position if a fresh fix takes too long.
 */
export async function getDeviceFix({ ask, timeoutMs = 10_000 }: { ask: boolean; timeoutMs?: number }): Promise<FixResult> {
  try {
    let perm = await Location.getForegroundPermissionsAsync();
    if (!perm.granted && ask && perm.canAskAgain) perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { ok: false, reason: 'denied', canAskAgain: perm.canAskAgain };
    if (!(await Location.hasServicesEnabledAsync())) return { ok: false, reason: 'off' };

    const fresh = await timeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeoutMs).catch(() => null);
    const pos = fresh ?? (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }).catch(() => null));
    return pos ? { ok: true, fix: toFix(pos) } : { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export type FoundAddress = { street: string; suburb: string; state: string; postcode: string };

const STATES: Record<string, string> = {
  victoria: 'VIC', 'new south wales': 'NSW', queensland: 'QLD', 'south australia': 'SA',
  'western australia': 'WA', tasmania: 'TAS', 'australian capital territory': 'ACT', 'northern territory': 'NT',
};

/** Street address at a map position (the phone's geocoder), or null. */
export async function addressAt(c: Coords): Promise<FoundAddress | null> {
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: c.lat, longitude: c.lng });
    if (!a) return null;
    const region = (a.region ?? '').trim();
    return {
      street: [a.streetNumber, a.street].filter(Boolean).join(' ') || a.name || '',
      suburb: a.district || a.city || a.subregion || '',
      state: STATES[region.toLowerCase()] ?? region.toUpperCase().slice(0, 3),
      postcode: (a.postalCode ?? '').replace(/\D/g, '').slice(0, 4),
    };
  } catch {
    return null;
  }
}

/** Map position of a typed address, or null (only when location permission is already granted: Android needs it). */
export async function coordsOf(address: string): Promise<Coords | null> {
  try {
    if (!(await Location.getForegroundPermissionsAsync()).granted) return null;
    const [r] = await timeout(Location.geocodeAsync(address), 8_000) ?? [];
    return r ? { lat: r.latitude, lng: r.longitude } : null;
  } catch {
    return null;
  }
}

/** Explain why there's no location, offering Settings when the system won't ask again. */
export function explainNoFix(r: Extract<FixResult, { ok: false }>) {
  if (r.reason === 'denied') {
    Alert.alert(
      'Location is off for Spice Kart',
      r.canAskAgain === false
        ? 'Allow location access in Settings to find your address, or enter it yourself.'
        : 'You can enter your address yourself instead.',
      r.canAskAgain === false
        ? [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        : [{ text: 'OK' }],
    );
  } else if (r.reason === 'off') {
    Alert.alert('Turn on Location Services', 'Your phone’s location is switched off. Turn it on in Settings, or enter your address yourself.', [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]);
  } else {
    Alert.alert('Couldn’t find your location', 'Please try again outside or near a window, or enter your address yourself.');
  }
}
