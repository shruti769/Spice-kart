import { STANDARD_ETA, STANDARD_ETA_SHORT } from '@/lib/remote-delivery';
import { useAddress } from '@/store/app-store';

const BRISBANE = { lat: -27.4698, lng: 153.0251 };
const BRISBANE_RADIUS_KM = 40;
/** Greater Brisbane postcodes (Brisbane, Logan, Redlands, Ipswich, Moreton Bay), used when an address has no map pin. */
const BRISBANE_POSTCODES: [number, number][] = [[4000, 4207], [4300, 4306], [4500, 4521]];

/** true = Brisbane, false = elsewhere in Australia, undefined = no address (or no way to tell). */
export function isBrisbaneAddress(a?: { lat?: number; lng?: number; line?: string }): boolean | undefined {
  if (!a) return undefined;
  if (a.lat != null && a.lng != null) {
    const rad = Math.PI / 180;
    const dLat = (a.lat - BRISBANE.lat) * rad;
    const dLng = (a.lng - BRISBANE.lng) * rad * Math.cos(BRISBANE.lat * rad);
    return 6371 * Math.hypot(dLat, dLng) <= BRISBANE_RADIUS_KM;
  }
  const pc = Number(a.line?.match(/(\d{4})\s*$/)?.[1]);
  if (!pc) return undefined;
  return BRISBANE_POSTCODES.some(([lo, hi]) => pc >= lo && pc <= hi);
}

/** Standard-delivery promise for the selected address: 2–4 hours in Brisbane, next day elsewhere. */
export function useStandardEta(): { short: string; long: string } {
  const bne = isBrisbaneAddress(useAddress());
  if (bne === true) return { short: '2–4 hr delivery', long: 'Arrives in 2–4 hours' };
  if (bne === false) return { short: 'Next-day delivery', long: 'Arrives the next day' };
  return { short: STANDARD_ETA_SHORT, long: STANDARD_ETA };
}
