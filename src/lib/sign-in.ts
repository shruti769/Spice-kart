import { router } from 'expo-router';

import { ensureBackendSession, linkPendingSocial } from '@/lib/firebase-auth';
import { useApp } from '@/store/app-store';

/** After verifying, collect the user's name and date of birth (then the address picker). */
function finishAuth() {
  if (router.canDismiss()) router.dismissAll();
  router.replace({ pathname: '/profile/personal', params: { setup: '1' } });
}

/** The Firebase user has a verified mobile (phone OTP, or Google / Apple already linked to one): open the app. */
export async function completeSignIn(phone: string) {
  const linkProblem = await linkPendingSocial();
  await ensureBackendSession();
  const state = useApp.getState();
  if (state.signedIn) return;
  state.set({ signedIn: true, user: { ...state.user, mobile: phone } });
  if (linkProblem) state.flash(linkProblem);
  finishAuth();
}
