import { createClient } from 'npm:@supabase/supabase-js@2.117.1';
import { createRemoteJWKSet } from 'npm:jose@6.1.0';
import { verifyFirebasePhone } from './verify-firebase.ts';

const firebaseProject = Deno.env.get('FIREBASE_PROJECT_ID');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
const keys = createRemoteJWKSet(new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
));
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const reply = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return reply(405, 'POST required');
  if (!firebaseProject || !supabaseUrl || !serviceKey || !anonKey) return reply(503, 'Authentication is not configured');
  const token = request.headers.get('Authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token || token.length > 16384) return reply(401, 'Firebase sign-in required');

  let uid: string;
  let phone: string;
  try {
    const identity = await verifyFirebasePhone(token, firebaseProject, keys);
    uid = identity.uid;
    phone = identity.phone;
  } catch {
    return reply(401, 'Invalid or expired Firebase token');
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    let { data: identity, error } = await admin.from('firebase_identities')
      .select('user_id, login_email').eq('firebase_uid', uid).maybeSingle();
    if (error) throw error;
    if (!identity) {
      // Random, server-private alias; never trust a phone/email/UUID supplied by the client.
      const email = `${crypto.randomUUID()}@firebase.spicekart.invalid`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email, email_confirm: true,
        app_metadata: { firebase_uid: uid, firebase_project: firebaseProject, verified_phone: phone },
      });
      if (createError || !created.user) throw createError ?? new Error('Account creation failed');
      const inserted = await admin.from('firebase_identities').insert({
        firebase_uid: uid, user_id: created.user.id, login_email: email,
      }).select('user_id, login_email').single();
      if (inserted.error) {
        // Two devices may finish their first login together. Keep only the winning mapping.
        await admin.auth.admin.deleteUser(created.user.id);
        if (inserted.error.code !== '23505') throw inserted.error;
        const existing = await admin.from('firebase_identities').select('user_id, login_email')
          .eq('firebase_uid', uid).single();
        if (existing.error) throw existing.error;
        identity = existing.data;
      } else identity = inserted.data;
    }
    if (!identity) throw new Error('Missing account mapping');
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(identity.user_id);
    if (accountError || account.user?.app_metadata.firebase_uid !== uid ||
        account.user.app_metadata.firebase_project !== firebaseProject ||
        account.user.email !== identity.login_email) throw new Error('Account identity mismatch');

    // Generate a one-time server-side credential, then exchange it for a normal Supabase
    // session. Existing UUID-based RLS and auth.users foreign keys continue to work.
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink', email: identity.login_email,
    });
    if (linkError || !link.properties?.hashed_token) throw linkError ?? new Error('Session creation failed');
    const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error: sessionError } = await client.auth.verifyOtp({
      type: 'magiclink', token_hash: link.properties.hashed_token,
    });
    if (sessionError || !data.session || data.session.user.id !== identity.user_id) throw sessionError ?? new Error('Session mismatch');
    return new Response(JSON.stringify({
      access_token: data.session.access_token, refresh_token: data.session.refresh_token,
    }), { headers });
  } catch {
    // Never log tokens, aliases, phone numbers, or service credentials.
    return reply(503, 'Could not establish your account session. Please retry.');
  }
});
