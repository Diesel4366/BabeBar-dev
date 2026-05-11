import crypto from 'crypto';

const BASE_URL = 'https://securepay.tinkoff.ru/v2';

function generateToken(params: Record<string, unknown>): string {
  const tokenParams: Record<string, unknown> = { ...params, Password: process.env.TINKOFF_PASSWORD };
  delete tokenParams['Token'];
  delete tokenParams['Receipt'];
  delete tokenParams['DATA'];

  const sorted = Object.keys(tokenParams).sort();
  const concatenated = sorted.map(k => String(tokenParams[k])).join('');
  return crypto.createHash('sha256').update(concatenated).digest('hex');
}

export function verifyWebhookToken(params: Record<string, unknown>): boolean {
  const received = params['Token'] as string;
  if (!received) return false;
  return received === generateToken(params);
}

export async function initPayment(opts: {
  orderId: string;
  amount: number;
  description: string;
  successUrl: string;
  failUrl: string;
  notificationUrl: string;
}): Promise<{ paymentId: string; paymentUrl: string } | null> {
  const body: Record<string, unknown> = {
    TerminalKey: process.env.TINKOFF_TERMINAL_KEY,
    Amount: Math.round(opts.amount * 100),
    OrderId: opts.orderId,
    Description: opts.description.slice(0, 140),
    SuccessURL: opts.successUrl,
    FailURL: opts.failUrl,
    NotificationURL: opts.notificationUrl,
  };
  body['Token'] = generateToken(body);

  const res = await fetch(`${BASE_URL}/Init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.Success) {
    console.error('Tinkoff Init failed:', data);
    return null;
  }

  return { paymentId: String(data.PaymentId), paymentUrl: data.PaymentURL };
}

export async function cancelPayment(paymentId: string, amount: number): Promise<boolean> {
  const body: Record<string, unknown> = {
    TerminalKey: process.env.TINKOFF_TERMINAL_KEY,
    PaymentId: paymentId,
    Amount: Math.round(amount * 100),
  };
  body['Token'] = generateToken(body);

  const res = await fetch(`${BASE_URL}/Cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.Success) {
    console.error('Tinkoff Cancel failed:', data);
    return false;
  }
  return true;
}
