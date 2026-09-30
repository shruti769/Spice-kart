import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { helpTopics, type HelpTopicId } from '@/data/help-topics';
import { onTableChange, singleFlight } from '@/lib/live-changes';
import { useDeliverySettings } from '@/lib/remote-delivery';
import { usePostcodeStore } from '@/lib/remote-postcodes';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Help centre questions live in the admin panel's `public.help_articles` (Admin → Support → Help
// centre). RLS returns published ones only. Until they load (or without Supabase) the app shows the
// built-in questions from `src/data/help-topics.ts`.

export type HelpArticle = {
  id: string;
  topic: HelpTopicId;
  q: string;
  sub: string;
  body: string;
  stepsTitle: string;
  steps: string[];
  note: string;
  views: number;
};

type Row = {
  id: string;
  topic: HelpTopicId;
  title: string;
  subtitle: string;
  body: string;
  steps_title: string;
  steps: string[] | null;
  note: string;
  views: number;
};

export const useHelpStore = create<{ articles: HelpArticle[]; loaded: boolean }>(() => ({ articles: [], loaded: false }));

const loadHelp = singleFlight(async () => {
  const { data, error } = await supabase
    .from('help_articles')
    .select('id, topic, title, subtitle, body, steps_title, steps, note, views')
    .order('sort')
    .order('created_at');
  if (error) {
    // Table not created yet: keep the built-in questions.
    if (__DEV__) console.warn('Could not load help articles:', error.message);
    return;
  }
  useHelpStore.setState({
    loaded: true,
    articles: (data as Row[]).map((r) => ({
      id: r.id,
      topic: r.topic,
      q: r.title,
      sub: r.subtitle,
      body: r.body,
      stepsTitle: r.steps_title,
      steps: r.steps ?? [],
      note: r.note,
      views: r.views,
    })),
  });
});

export function refreshHelp() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadHelp();
}

let started = false;

/** Load help articles now, on foreground, and live when an admin edits them. */
export function startRemoteHelp() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  refreshHelp();
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshHelp();
  });
  onTableChange(['help_articles'], refreshHelp);
}

/** Counts an expanded question (fire and forget). */
export function trackHelpView(id: string) {
  if (!isSupabaseConfigured) return;
  supabase.rpc('help_article_viewed', { p_id: id }).then(
    () => {},
    () => {},
  );
}

/** "Was this helpful?" Yes / No (fire and forget). */
export function sendHelpFeedback(id: string, helpful: boolean) {
  if (!isSupabaseConfigured) return;
  supabase.rpc('help_article_feedback', { p_id: id, p_helpful: helpful }).then(
    () => {},
    () => {},
  );
}

/** Help centre topics with live questions and fees. */
export function useHelpTopics() {
  // Also loads on first use, so help screens never depend on the root layout having started it.
  useEffect(() => {
    startRemoteHelp();
    refreshHelp();
  }, []);
  const settings = useDeliverySettings();
  const postcodes = usePostcodeStore((s) => s.postcodes);
  const articles = useHelpStore((s) => s.articles);
  const loaded = useHelpStore((s) => s.loaded);
  return useMemo(() => helpTopics(settings, [...postcodes], { articles, loaded }), [settings, postcodes, articles, loaded]);
}
