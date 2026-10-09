import { createClient } from 'npm:@supabase/supabase-js@2';

const jsonHeaders = { 'Content-Type': 'application/json' };

// Sign in with Apple: apps must revoke the user's Apple tokens when the account
// is deleted (App Store Guideline 5.1.1(v)). Supabase's native id-token sign-in
// never stores an Apple refresh token, so the app re-authorizes with Apple right
// before deletion and sends the fresh authorization code here. We exchange it for
// a refresh token and revoke that, which removes BookHoarder from the user's
// "Sign in with Apple" list in their Apple ID settings.
//
// Secrets (supabase secrets set ...): APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
// (the .p8 file contents). APPLE_CLIENT_ID defaults to the iOS bundle id.
const APPLE_CLIENT_ID = Deno.env.get('APPLE_CLIENT_ID') ?? 'com.bookvault.app';

function base64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  let bin = '';
  for (const b of raw) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Apple's client_secret is a short-lived ES256 JWT signed with the .p8 key
async function appleClientSecret(teamId: string, keyId: string, p8: string): Promise<string> {
  const pem = p8.replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64url(JSON.stringify({
    iss: teamId, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: APPLE_CLIENT_ID,
  }));
  // WebCrypto emits the raw r||s signature, which is exactly what JWS ES256 expects
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${header}.${payload}`)
  );
  return `${header}.${payload}.${base64url(new Uint8Array(sig))}`;
}

function jwtSubject(jwt: string): string | undefined {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part)).sub;
  } catch {
    return undefined;
  }
}

// Returns why revocation was skipped/failed, or null on success. Never throws:
// account deletion must still go through even if Apple is unreachable.
async function revokeApple(authorizationCode: string, appleSub: string): Promise<string | null> {
  const teamId = Deno.env.get('APPLE_TEAM_ID');
  const keyId = Deno.env.get('APPLE_KEY_ID');
  const p8 = Deno.env.get('APPLE_PRIVATE_KEY');
  if (!teamId || !keyId || !p8) return 'Apple secrets not configured';

  try {
    const clientSecret = await appleClientSecret(teamId, keyId, p8);

    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: APPLE_CLIENT_ID,
        client_secret: clientSecret,
        code: authorizationCode,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) return `token exchange failed: ${tokens.error ?? tokenRes.status}`;

    // Only revoke if the code belongs to the same Apple ID linked to this account
    if (jwtSubject(tokens.id_token ?? '') !== appleSub) return 'Apple ID does not match account';

    const revokeRes = await fetch('https://appleid.apple.com/auth/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: APPLE_CLIENT_ID,
        client_secret: clientSecret,
        token: tokens.refresh_token ?? tokens.access_token,
        token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
      }),
    });
    if (!revokeRes.ok) return `revoke failed: ${revokeRes.status} ${await revokeRes.text()}`;
    return null;
  } catch (e) {
    return `revoke error: ${e instanceof Error ? e.message : String(e)}`;
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
  }

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  // Resolve the caller from their own JWT — a user can only delete themselves
  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders });
  }

  // Older app builds send no body
  const body = await req.json().catch(() => ({}));
  const appleIdentity = user.identities?.find((i) => i.provider === 'apple');
  const appleSub = appleIdentity?.identity_data?.sub ?? appleIdentity?.id;
  let appleRevoked = false;
  if (appleSub) {
    const code = typeof body?.appleAuthorizationCode === 'string' ? body.appleAuthorizationCode : '';
    const problem = code ? await revokeApple(code, appleSub) : 'no authorization code sent';
    appleRevoked = problem === null;
    if (problem) console.error(`Apple token revocation skipped for ${user.id}: ${problem}`);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ success: true, appleRevoked }), { headers: jsonHeaders });
});
