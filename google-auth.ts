import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { shell } from 'electron';
import { getSetting, setSecret, setSetting } from './db';
import { assertSecureStorageAvailable, storeSecret } from './secure-store';
import type { UserProfile } from '../shared/types';

function base64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function getGoogleProfile(): UserProfile | null {
  const raw = getSetting('google.profile');
  if (!raw) return null;
  try { return JSON.parse(raw) as UserProfile; }
  catch { return null; }
}

export function signOutGoogle(): void {
  setSecret('google.refresh_token', null);
  setSetting('google.profile', '');
}

export async function signInGoogle(): Promise<UserProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Google sign-in is not configured. Add GOOGLE_CLIENT_ID from a Google Cloud Desktop OAuth client, then restart NOVA.');
  await assertSecureStorageAvailable();

  const verifier = base64Url(randomBytes(48));
  const challenge = base64Url(createHash('sha256').update(verifier).digest());
  const state = base64Url(randomBytes(24));

  let callbackRedirectUri = '';
  const result = await new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error, code?: string) => {
      if (settled) return;
      settled = true;
      server.close();
      if (error) reject(error);
      else resolve(code ?? '');
    };
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (url.pathname !== '/') {
        response.writeHead(404).end('Not found');
        return;
      }
      const returnedState = url.searchParams.get('state');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      if (returnedState !== state) {
        response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }).end('<h2>Sign-in could not be verified.</h2>You can close this tab.');
        finish(new Error('Google OAuth state validation failed.'));
        return;
      }
      if (error || !code) {
        response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }).end('<h2>Sign-in was cancelled.</h2>You can close this tab.');
        finish(new Error(`Google sign-in was not completed${error ? ` (${error})` : ''}.`));
        return;
      }
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(`<!doctype html><title>NOVA sign-in complete</title><main style="font:16px system-ui;padding:3rem"><h2>You're signed in to NOVA.</h2><p>You can close this browser tab and return to the app.</p></main>`);
      finish(undefined, code);
    });
    server.on('error', (error) => finish(error));
    server.listen(0, '127.0.0.1', async () => {
      const address = server.address();
      if (!address || typeof address === 'string') return finish(new Error('Could not start the local sign-in listener.'));
      const redirectUri = `http://127.0.0.1:${address.port}`;
      callbackRedirectUri = redirectUri;
      const authorize = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authorize.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callbackRedirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
        access_type: 'offline',
        prompt: 'consent select_account',
      }).toString();
      try { await shell.openExternal(authorize.toString()); }
      catch (error) { finish(error instanceof Error ? error : new Error('Could not open the system browser.')); }
    });
    setTimeout(() => finish(new Error('Google sign-in timed out. Please try again.')), 180000).unref();
  });

  if (!callbackRedirectUri) throw new Error('The OAuth callback completed but the local redirect URI was not retained.');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      code: result,
      code_verifier: verifier,
      redirect_uri: callbackRedirectUri,
      grant_type: 'authorization_code',
    }),
    signal: AbortSignal.timeout(20000),
  });
  const tokens = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokens.access_token) throw new Error(tokens.error_description ?? `Google token exchange failed (${tokenResponse.status}).`);

  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    signal: AbortSignal.timeout(15000),
  });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user.email) throw new Error('Google sign-in succeeded, but the profile could not be retrieved.');

  const profile: UserProfile = {
    name: String(user.name ?? user.email),
    email: String(user.email),
    picture: typeof user.picture === 'string' ? user.picture : undefined,
  };
  if (typeof tokens.refresh_token === 'string' && tokens.refresh_token) {
    await storeSecret('google.refresh_token', tokens.refresh_token);
  }
  setSetting('google.profile', JSON.stringify(profile));
  return profile;
}
