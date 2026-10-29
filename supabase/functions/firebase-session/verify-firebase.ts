import { jwtVerify, type JWTVerifyGetKey } from 'npm:jose@6.1.0';

export async function verifyFirebasePhone(token: string, project: string, keys: JWTVerifyGetKey) {
  const { payload } = await jwtVerify(token, keys, {
    algorithms: ['RS256'],
    issuer: `https://securetoken.google.com/${project}`,
    audience: project,
    requiredClaims: ['sub', 'iat', 'exp', 'auth_time'],
  });
  // Phone OTP, or Google / Apple on an account the app has linked to a verified mobile
  // (Firebase only sets phone_number after an OTP), so every account stays keyed by a real phone.
  const firebase = payload.firebase as { sign_in_provider?: string } | undefined;
  if (!payload.sub || payload.sub.length > 128 || !['phone', 'google.com', 'apple.com'].includes(firebase?.sign_in_provider ?? '') ||
      typeof payload.phone_number !== 'string' || !/^\+[1-9]\d{7,14}$/.test(payload.phone_number) ||
      typeof payload.auth_time !== 'number' || payload.auth_time > Date.now() / 1000 + 30 ||
      typeof payload.iat !== 'number' || payload.iat > Date.now() / 1000 + 30) {
    throw new Error('A verified phone sign-in is required');
  }
  return { uid: payload.sub, phone: payload.phone_number };
}
