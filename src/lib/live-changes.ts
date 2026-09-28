import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// One Realtime subscription to `public.app_changes`, which a trigger bumps on every write to the
// admin-managed tables. Listening to it (instead of each table) also catches rows being hidden —
// Realtime never sends the app changes to rows it isn't allowed to read.

const handlers = new Map<string, Set<() => void>>();
const timers = new Map<() => void, ReturnType<typeof setTimeout>>();
let subscribed = false;

/**
 * Wraps a loader so overlapping calls share one run; a call made while it's running queues one more
 * run afterwards, so a change that lands mid-fetch is never missed.
 */
export function singleFlight(load: () => Promise<void>) {
  let running: Promise<void> | null = null;
  let again = false;
  const run = (): Promise<void> => {
    if (running) {
      again = true;
      return running;
    }
    running = load().finally(() => {
      running = null;
      if (again) {
        again = false;
        run();
      }
    });
    return running;
  };
  return run;
}

/** Run `fn` (debounced) whenever any of `tables` changes. */
export function onTableChange(tables: string[], fn: () => void) {
  if (!isSupabaseConfigured) return;
  for (const t of tables) {
    if (!handlers.has(t)) handlers.set(t, new Set());
    handlers.get(t)!.add(fn);
  }
  if (subscribed) return;
  subscribed = true;
  supabase
    .channel('app-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'app_changes' }, (payload) => {
      const table = (payload.new as { table_name?: string } | null)?.table_name;
      for (const cb of (table && handlers.get(table)) || []) {
        // One admin save can touch several tables (e.g. category + sub-categories): refresh once.
        clearTimeout(timers.get(cb));
        timers.set(cb, setTimeout(() => { timers.delete(cb); cb(); }, 250));
      }
    })
    .subscribe();
}
