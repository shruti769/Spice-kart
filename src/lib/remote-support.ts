import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import { singleFlight } from '@/lib/live-changes';
import { ensureUserId, uploadPhoto } from '@/lib/remote-profile';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useApp } from '@/store/app-store';

// Support chats live in the admin panel's `public.support_tickets` / `public.support_messages`
// (Admin → Support → Inbox). RLS returns only this customer's tickets and never internal notes.
// Agent replies arrive live over Realtime; chat photos go to the private `support-photos` bucket.

export type SupportTopic = 'orders' | 'delivery' | 'payments' | 'refunds' | 'wallet' | 'addresses' | 'account' | 'general';
export type TicketStatus = 'open' | 'pending' | 'resolved';

export type Ticket = {
  id: string;
  /** "SK-2041" */
  number: string;
  subject: string;
  topic: SupportTopic;
  status: TicketStatus;
  orderId: string | null;
  /** "SK10482" */
  orderNo: string | null;
  lastMessageAt: string;
  preview: string;
  /** An agent replied since the customer last looked. */
  unread: boolean;
  csat: number | null;
  createdAt: string;
};

export type ChatMessage = {
  id: string;
  from: 'me' | 'agent';
  author: string;
  text: string;
  /** Signed photo URL (or a local URI while sending). */
  image?: string;
  at: string;
  /** Still sending. */
  pending?: boolean;
};

type TicketRow = {
  id: string;
  number: string;
  subject: string;
  topic: SupportTopic;
  status: TicketStatus;
  order_id: string | null;
  last_message_at: string;
  last_message_preview: string;
  last_sender: 'customer' | 'agent';
  customer_last_read_at: string;
  csat: number | null;
  created_at: string;
  order: { number: string } | null;
};

type MessageRow = { id: number; sender: 'customer' | 'agent'; author_name: string; body: string; image_path: string | null; created_at: string };

const BUCKET = 'support-photos';
const TICKET_COLUMNS =
  'id, number, subject, topic, status, order_id, last_message_at, last_message_preview, last_sender, customer_last_read_at, csat, created_at, order:orders(number)';

const fromRow = (r: TicketRow): Ticket => ({
  id: r.id,
  number: r.number,
  subject: r.subject,
  topic: r.topic,
  status: r.status,
  orderId: r.order_id,
  orderNo: r.order?.number ?? null,
  lastMessageAt: r.last_message_at,
  preview: r.last_message_preview,
  unread: r.last_sender === 'agent' && r.last_message_at > r.customer_last_read_at,
  csat: r.csat,
  createdAt: r.created_at,
});

export const useSupportStore = create<{ tickets: Ticket[]; loaded: boolean }>(() => ({ tickets: [], loaded: false }));

const loadTickets = singleFlight(async () => {
  if (!useApp.getState().signedIn) return;
  try {
    await ensureUserId();
    const { data, error } = await supabase.from('support_tickets').select(TICKET_COLUMNS).order('last_message_at', { ascending: false }).limit(30);
    if (error) throw error;
    if (useApp.getState().signedIn) useSupportStore.setState({ tickets: (data as unknown as TicketRow[]).map(fromRow), loaded: true });
  } catch (e) {
    if (__DEV__) console.warn('Could not load support chats:', (e as Error).message);
  }
});

export function refreshTickets() {
  if (!isSupabaseConfigured) return Promise.resolve();
  return loadTickets();
}

let channel: RealtimeChannel | null = null;

async function subscribe() {
  if (channel) return;
  try {
    const uid = await ensureUserId();
    if (channel || !useApp.getState().signedIn) return;
    channel = supabase
      .channel('my-support')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `customer_id=eq.${uid}` }, () => refreshTickets())
      .subscribe();
  } catch {
    // Retried on the next sign-in.
  }
}

function unsubscribe() {
  if (channel) supabase.removeChannel(channel);
  channel = null;
  useSupportStore.setState({ tickets: [], loaded: false });
}

let started = false;

/** Load this customer's chats when signed in (and on foreground), live-update them, and clear them on log out. */
export function startRemoteSupport() {
  if (started || !isSupabaseConfigured) return;
  started = true;
  useApp.subscribe((s, prev) => {
    if (s.signedIn && !prev.signedIn) {
      refreshTickets();
      subscribe();
    }
    if (!s.signedIn && prev.signedIn) unsubscribe();
  });
  if (useApp.persist.hasHydrated() && useApp.getState().signedIn) {
    refreshTickets();
    subscribe();
  }
  AppState.addEventListener('change', (s) => {
    if (s === 'active') refreshTickets();
  });
}

/** This customer's chats, newest activity first. Refreshes whenever the calling screen mounts. */
export function useSupportTickets() {
  useEffect(() => {
    refreshTickets();
  }, []);
  return useSupportStore();
}

// ─── One conversation ───────────────────────────────────────────────────────────────────

async function signedUrls(paths: string[]) {
  if (!paths.length) return new Map<string, string>();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as [string, string]] : [])));
}

/**
 * The messages of `ticketId`, live: new agent replies appear as soon as they're sent. `pending`
 * messages the screen adds while sending show until the next load includes them.
 */
export function useChat(ticketId: string | null) {
  // Messages are kept per ticket, so switching chats never flashes the previous thread.
  const [state, setState] = useState<{ ticketId: string | null; messages: ChatMessage[] }>({ ticketId: null, messages: [] });
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((n) => n + 1), []);

  useEffect(() => {
    if (!ticketId || !isSupabaseConfigured) return;
    let alive = true;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select('id, sender, author_name, body, image_path, created_at')
          .eq('ticket_id', ticketId)
          .order('created_at')
          .order('id');
        if (error) throw error;
        const rows = data as MessageRow[];
        const urls = await signedUrls(rows.flatMap((m) => (m.image_path ? [m.image_path] : [])));
        if (!alive) return;
        setState({
          ticketId,
          messages: rows.map((m) => ({
            id: String(m.id),
            from: m.sender === 'customer' ? 'me' : 'agent',
            author: m.author_name,
            text: m.body,
            image: m.image_path ? urls.get(m.image_path) : undefined,
            at: m.created_at,
          })),
        });
        // Anything being sent is now in the thread.
        setPending([]);
      } catch (e) {
        if (__DEV__) console.warn('Could not load the chat:', (e as Error).message);
        if (alive) setState((s) => (s.ticketId === ticketId ? s : { ticketId, messages: [] }));
      }
    };
    load();
    const live = supabase
      .channel(`chat-${ticketId}-${version}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${ticketId}` }, () => load())
      .subscribe();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') load();
    });
    return () => {
      alive = false;
      sub.remove();
      supabase.removeChannel(live);
    };
  }, [ticketId, version]);

  const current = !!ticketId && state.ticketId === ticketId;
  return {
    loading: !!ticketId && isSupabaseConfigured && !current,
    messages: [...(current ? state.messages : []), ...pending],
    setPending,
    reload,
  };
}

/** Opens a new chat (optionally about an order, with a photo) and returns its ticket id. */
export async function openTicket(input: { subject: string; message: string; topic: SupportTopic; orderId?: string | null; photoUri?: string | null }) {
  const uid = await ensureUserId();
  const imagePath = input.photoUri ? await uploadPhoto(BUCKET, uid, input.photoUri) : null;
  const { data, error } = await supabase.rpc('open_support_ticket', {
    p_subject: input.subject,
    p_message: input.message,
    p_topic: input.topic,
    p_order: input.orderId ?? null,
    p_image: imagePath,
  });
  if (error) throw error;
  await refreshTickets();
  return (data as { id: string }).id;
}

/** Adds a message (and/or a photo) to an existing chat. A resolved chat reopens. */
export async function sendChatMessage(ticketId: string, text: string, photoUri?: string | null) {
  const uid = await ensureUserId();
  const imagePath = photoUri ? await uploadPhoto(BUCKET, uid, photoUri) : null;
  const { error } = await supabase.from('support_messages').insert({ ticket_id: ticketId, sender: 'customer', body: text.trim(), image_path: imagePath });
  if (error) throw error;
}

/** Clears the unread dot for a chat. */
export async function markTicketRead(ticketId: string) {
  useSupportStore.setState((s) => ({ tickets: s.tickets.map((t) => (t.id === ticketId ? { ...t, unread: false } : t)) }));
  await supabase.from('support_tickets').update({ customer_last_read_at: new Date().toISOString() }).eq('id', ticketId);
}

/** 1–5 stars once a chat is resolved. */
export async function rateTicket(ticketId: string, csat: number) {
  const { error } = await supabase.from('support_tickets').update({ csat }).eq('id', ticketId);
  if (error) throw error;
  await refreshTickets();
}

/** Guesses a topic from what the customer typed (support can change it). */
export function guessTopic(text: string, hasOrder: boolean): SupportTopic {
  const t = text.toLowerCase();
  if (/refund|money back/.test(t)) return 'refunds';
  if (/driver|deliver|late|arriv|address|door/.test(t)) return 'delivery';
  if (/pay|card|charge|declin/.test(t)) return 'payments';
  if (/wallet|balance|cashback/.test(t)) return 'wallet';
  if (/login|account|password|notification/.test(t)) return 'account';
  return hasOrder ? 'orders' : 'general';
}
