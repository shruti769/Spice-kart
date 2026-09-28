import { scheduledLabel, useDeliveryStore } from '@/lib/remote-delivery';

/** "Express · 25 minutes" or "<day> · <window>" for the chosen slot (id of a `delivery_slots` row). */
export function slotLabelOf(slot: string | null, schDay: string) {
  if (slot === 'ASAP' || !slot || !schDay) return 'Express · ' + useDeliveryStore.getState().settings.etaMinutes + ' minutes';
  return scheduledLabel(slot, schDay);
}
