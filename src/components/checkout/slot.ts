import { ETA_MINUTES } from '@/data/catalog';

/** Scheduled delivery windows: [slot key, label, fee]. */
export const SCH_WINDOWS: [string, string, string][] = [
  ['11:30', '11:30 – 12:00', '$3.99'],
  ['12:00', '12:00 – 12:30', '$3.99'],
  ['12:30', '12:30 – 1:00', '$2.99'],
  ['13:00', '1:00 – 1:30', 'Free'],
];

export const SCH_DAYS: [string, string][] = [
  ['Today', '1 Sep'],
  ['Tomorrow', '2 Sep'],
  ['Wed', '3 Sep'],
  ['Thu', '4 Sep'],
];

/** Label of a scheduled window (falls back to the first window). */
export const windowLabel = (slot: string) => (SCH_WINDOWS.find((w) => w[0] === slot) ?? SCH_WINDOWS[0])[1];

/** Prototype `slotLabel`: "Express · 25 minutes" or "<day> · <window>". */
export function slotLabelOf(slot: string | null, schDay: string) {
  if (slot === 'ASAP' || !slot) return 'Express · ' + ETA_MINUTES + ' minutes';
  return (schDay || 'Today') + ' · ' + windowLabel(slot);
}
