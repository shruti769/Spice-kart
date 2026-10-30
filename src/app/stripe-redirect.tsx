import { router } from 'expo-router';
import { useEffect } from 'react';

/** The root Stripe callback handles authentication; restore the screen underneath it. */
export default function StripeRedirectScreen() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  return null;
}
