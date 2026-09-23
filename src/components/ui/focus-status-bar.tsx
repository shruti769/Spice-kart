import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

/**
 * Sets the status bar style while the screen is focused and restores dark on blur.
 * Unlike `<StatusBar />`, this doesn't leak from screens that stay mounted under the stack.
 */
export function FocusStatusBar({ style }: { style: 'light' | 'dark' }) {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style, true);
      return () => setStatusBarStyle('dark', true);
    }, [style]),
  );
  return null;
}
