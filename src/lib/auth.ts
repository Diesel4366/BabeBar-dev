function bytesToBase64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(str: string): ArrayBuffer {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const buf = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);
  return buf;
}

export async function createAdminToken(secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const payload = btoa(JSON.stringify({ ts: Date.now() }))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return `${payload}.${bytesToBase64url(sig)}`;
}

let _cachedVerifyKey: CryptoKey | null = null;
let _cachedVerifySecret = '';

async function getVerifyKey(secret: string): Promise<CryptoKey> {
  if (_cachedVerifyKey && _cachedVerifySecret === secret) return _cachedVerifyKey;
  const encoder = new TextEncoder();
  _cachedVerifyKey = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['verify']
  );
  _cachedVerifySecret = secret;
  return _cachedVerifyKey;
}

const TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function verifyAdminToken(token: string, secret: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [payloadB64, sigB64] = parts;
    const encoder = new TextEncoder();
    const key = await getVerifyKey(secret);
    const sig = base64urlToBuffer(sigB64);
    const valid = await crypto.subtle.verify('HMAC', key, sig, encoder.encode(payloadB64));
    if (!valid) return false;

    const b64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - payloadB64.length % 4) % 4);
    const { ts } = JSON.parse(atob(b64));
    return typeof ts === 'number' && Date.now() - ts < TOKEN_MAX_AGE_MS;
  } catch {
    return false;
  }
}
