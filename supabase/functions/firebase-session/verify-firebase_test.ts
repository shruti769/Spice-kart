import { generateKeyPair, SignJWT, type JWTPayload } from 'npm:jose@6.1.0';
import { verifyFirebasePhone } from './verify-firebase.ts';

const project = 'spicekart-f3459';
const pair = await generateKeyPair('RS256');
const keys = async () => pair.publicKey;
const now = Math.floor(Date.now() / 1000);
async function token(overrides: JWTPayload = {}, otherKey = false) {
  const signer = otherKey ? (await generateKeyPair('RS256')).privateKey : pair.privateKey;
  return new SignJWT({
    sub: 'verified-user', iss: `https://securetoken.google.com/${project}`, aud: project,
    iat: now, exp: now + 3600, auth_time: now,
    phone_number: '+61412345678', firebase: { sign_in_provider: 'phone' }, ...overrides,
  }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).sign(signer);
}
Deno.test('accepts a signed phone identity from the configured Firebase project', async () => {
  const result = await verifyFirebasePhone(await token(), project, keys);
  if (result.uid !== 'verified-user' || result.phone !== '+61412345678') throw new Error('Wrong identity');
});
for (const [name, overrides] of Object.entries({
  'wrong project': { aud: 'another-project' },
  'wrong issuer': { iss: 'https://attacker.invalid' },
  'expired token': { exp: now - 60 },
  'missing phone': { phone_number: null },
  'anonymous provider': { firebase: { sign_in_provider: 'anonymous' } },
  'future authentication': { auth_time: now + 3600 },
  'future issue time': { iat: now + 3600 },
  'empty UID': { sub: '' },
})) {
  Deno.test(`rejects ${name}`, async () => {
    try { await verifyFirebasePhone(await token(overrides), project, keys); }
    catch { return; }
    throw new Error(`Accepted ${name}`);
  });
}
for (const provider of ['google.com', 'apple.com']) {
  Deno.test(`accepts ${provider} sign-in on an account with a verified phone`, async () => {
    const result = await verifyFirebasePhone(await token({ firebase: { sign_in_provider: provider } }), project, keys);
    if (result.phone !== '+61412345678') throw new Error('Wrong identity');
  });
  Deno.test(`rejects ${provider} sign-in without a verified phone`, async () => {
    try { await verifyFirebasePhone(await token({ firebase: { sign_in_provider: provider }, phone_number: null }), project, keys); }
    catch { return; }
    throw new Error(`Accepted ${provider} without a phone`);
  });
}
Deno.test('rejects forged signatures', async () => {
  try { await verifyFirebasePhone(await token({}, true), project, keys); }
  catch { return; }
  throw new Error('Accepted forged signature');
});
