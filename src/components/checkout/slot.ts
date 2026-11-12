import { scheduledLabel, STANDARD_ETA } from '@/lib/remote-delivery';

/** "Standard delivery · 2–4 hours in Brisbane, …" or "<day> · <window>" for the chosen slot (id of a `delivery_slots` row). */
export function slotLabelOf(slot: string | null, schDay: string) {
  if (slot === 'ASAP' || !slot || !schDay) return 'Standard delivery · ' + STANDARD_ETA;
  return scheduledLabel(slot, schDay);
}
