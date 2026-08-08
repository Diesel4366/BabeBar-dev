function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64urlDecode(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0)).buffer;
}

async function hmacKey(secret: string) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createUserToken(profileId: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await hmacKey(secret);
  const payload = btoa(JSON.stringify({ id: profileId, ts: Date.now() }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifyUserToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const [payloadB64, sigB64] = parts;
    const enc = new TextEncoder();
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(sigB64), enc.encode(payloadB64));
    if (!valid) return null;

    const padding = '='.repeat((4 - (payloadB64.length % 4)) % 4);
    const { id, ts } = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/') + padding));
    if (typeof ts !== 'number' || Date.now() - ts > TOKEN_MAX_AGE_MS) return null;
    if (typeof id !== 'string' || !id) return null;
    return id;
  } catch {
    return null;
  }
}

export async function verifyTelegramAuth(data: Record<string, string>): Promise<boolean> {
  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return false;

  const { hash, ...rest } = data;
  if (!hash) return false;

  const enc = new TextEncoder();
  const checkStr = Object.entries(rest)
    .filter(([, v]) => v !== '' && v !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = await crypto.subtle.digest('SHA-256', enc.encode(token));
  const hmac = await crypto.subtle.importKey('raw', secretKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', hmac, enc.encode(checkStr));

  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

  const authDate = parseInt(rest.auth_date ?? '0');
  if (Math.floor(Date.now() / 1000) - authDate > 86400) return false;

  return computed === hash;
}

export async function exchangeTelegramCode(code: string, redirectUri: string) {
  const clientId = '8752821995';
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;

  if (!clientSecret) {
    console.error('CRITICAL: TELEGRAM_CLIENT_SECRET not found in environment');
    return null;
  }

  try {
    const res = await fetch('https://oauth.telegram.org/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Telegram token exchange error:', errorText);
      return null;
    }

    const data = await res.json();
    
    if (data.id_token) {
      const parts = data.id_token.split('.');
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      
      // Декодируем с поддержкой UTF-8 (для русских имен)
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      
      return {
        id: String(payload.sub),
        first_name: payload.name || payload.given_name || payload.nickname || 'User',
        username: payload.nickname || null,
        photo_url: payload.picture || null
      };
    }
  } catch (e) {
    console.error('exchangeTelegramCode exception:', e);
  }

  return null;
}
