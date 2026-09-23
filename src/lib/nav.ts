import { router, type Href } from 'expo-router';

export type TabName = 'home' | 'categories' | 'search' | 'orders';

/**
 * Prototype `tab(screen)`: jump to a bottom-nav tab and clear anything pushed on top of it.
 */
export function goTab(name: TabName) {
  if (router.canDismiss()) router.dismissAll();
  router.navigate(`/${name}` as Href);
}

/** Prototype `goBack()`: pop, or fall back to Home when there is nothing to pop. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/home');
}

/** Prototype `setState({ screen, stack: [] })`: show a screen with a fresh history on top of Home. */
export function resetTo(href: Href) {
  if (router.canDismiss()) router.dismissAll();
  router.push(href);
}

export const openCategory = (id: string) => router.push({ pathname: '/category/[id]', params: { id } });
export const openProduct = (id: string) => router.push({ pathname: '/product/[id]', params: { id } });
