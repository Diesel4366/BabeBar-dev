export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const token = process.env.TELEGRAM_TOKEN;
  if (!token) return;

  const base = `https://api.telegram.org/bot${token}`;

  const post = async (method: string, body: object) => {
    try {
      const res = await fetch(`${base}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (e) {
      console.error(`[Telegram] ${method} error:`, e);
    }
  };

  // Регистрируем webhook (с секретом если задан)
  const webhookBody: Record<string, string> = { url: 'https://babebar.ru/api/telegram' };
  if (process.env.TELEGRAM_WEBHOOK_SECRET) {
    webhookBody.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
  }
  const webhook = await post('setWebhook', webhookBody);
  if (webhook?.ok) {
    console.log('[Telegram] Webhook registered:', webhook.description);
  } else {
    console.error('[Telegram] Webhook failed:', webhook?.description);
  }

  // Регистрируем команды
  const commands = await post('setMyCommands', {
    commands: [
      { command: 'start', description: '🏠 Главное меню' },
      { command: 'my',    description: '📅 Мои записи' },
    ],
  });
  if (commands?.ok) {
    console.log('[Telegram] Commands registered');
  } else {
    console.error('[Telegram] Commands failed:', commands?.description);
  }
}
