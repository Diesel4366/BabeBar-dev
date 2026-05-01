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

export async function createUserToken(profileId: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(profileId));
  const idB64 = btoa(profileId).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${idB64}.${b64url(sig)}`;
}

export async function verifyUserToken(token: string, secret: string): Promise<string | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  try {
    const profileId = atob(parts[0].replace(/-/g, '+').replace(/_/g, '/'));
    const enc = new TextEncoder();
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(parts[1]), enc.encode(profileId));
    return valid ? profileId : null;
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
