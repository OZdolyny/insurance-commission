// Minimal Telegram Bot API client for server-side use.
// Files in api/_lib are helpers: Vercel does not turn names starting with "_" into endpoints.

export class TelegramError extends Error {
  constructor(message, { code, retryAfter } = {}) {
    super(message)
    this.name = 'TelegramError'
    this.code = code
    this.retryAfter = retryAfter
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Send one HTML message to the configured chat. Retries once on rate limits (429),
// Telegram server errors (5xx) and network failures. Error messages never include the
// request URL, because it contains the bot token.
export async function sendTelegramMessage(text, { token, chatId, fetchImpl = fetch, wait = sleep } = {}) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  const payload = JSON.stringify({
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
  })

  for (let attempt = 1; ; attempt++) {
    let body
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      })
      body = await response.json()
    } catch {
      if (attempt < 2) {
        await wait(2000)
        continue
      }
      throw new TelegramError('Could not reach Telegram', { code: 'network' })
    }

    if (body.ok) return body.result

    const code = body.error_code
    const retryAfter = body.parameters?.retry_after
    if (attempt < 2 && (code === 429 || code >= 500)) {
      await wait(Math.min((retryAfter || 2) * 1000, 10000))
      continue
    }
    throw new TelegramError(describeError(code, body.description), { code, retryAfter })
  }
}

function describeError(code, description) {
  if (code === 401) return 'Telegram rejected the bot token (TELEGRAM_BOT_TOKEN is wrong or was revoked)'
  if (code === 403) return 'The bot is not allowed to message this chat: open the bot in Telegram and press Start'
  if (code === 400 && /chat not found/i.test(description || '')) return 'Chat not found: check TELEGRAM_CHAT_ID'
  return `Telegram error ${code}: ${description || 'unknown'}`
}
