import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

// Expo Go on Android throws as soon as expo-notifications is imported (removed in SDK 53), so it's
// only loaded where push works. Use a development build to test push on Android.
type NotificationsModule = typeof import('expo-notifications');

export const Notifications: NotificationsModule | null =
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Platform.OS === 'android' && isRunningInExpoGo() ? null : require('expo-notifications');

/** `useLastNotificationResponse`, or always null where notifications aren't available. */
export const useLastNotificationResponse: NotificationsModule['useLastNotificationResponse'] =
  Notifications?.useLastNotificationResponse ?? (() => null);
