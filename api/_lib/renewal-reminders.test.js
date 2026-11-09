import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET, runReminders } from '../renewal-reminders.js'
import { GET as keepAlive } from '../keep-alive.js'
import { sendTelegramMessage, TelegramError } from './telegram.js'

// ---- Small in-memory stand-in for the Supabase client ----
function fakeSupabase(tables) {
  let nextId = 100
  const writes = []
  const from = (table) => {
    const state = { filters: [], op: 'select', values: null }
    const matches = (row) => state.filters.every(([op, col, val]) =>
      op === 'gte' ? row[col] >= val : op === 'lte' ? row[col] <= val : op === 'in' ? val.includes(row[col]) : row[col] === val)
    const run = () => {
      const rows = tables[table]
      if (state.op === 'upsert') {
        const inserted = []
        for (const value of state.values) {
          const duplicate = rows.some((r) => ['policy_id', 'kind', 'days_before', 'channel'].every((k) => r[k] === value[k]))
          if (!duplicate) inserted.push({ id: nextId++, status: 'pending', attempts: 0, ...value })
        }
        rows.push(...inserted)
        writes.push({ table, op: 'upsert', rows: inserted })
        return { data: inserted, error: null }
      }
      if (state.op === 'update') {
        const updated = rows.filter(matches)
        updated.forEach((r) => Object.assign(r, state.values))
        writes.push({ table, op: 'update', ids: updated.map((r) => r.id), values: state.values })
        return { data: updated, error: null }
      }
      return { data: rows.filter(matches), error: null }
    }
    const builder = {
      select: () => builder,
      gte: (c, v) => (state.filters.push(['gte', c, v]), builder),
      lte: (c, v) => (state.filters.push(['lte', c, v]), builder),
      in: (c, v) => (state.filters.push(['in', c, v]), builder),
      eq: (c, v) => (state.filters.push(['eq', c, v]), builder),
      upsert: (values) => ((state.op = 'upsert'), (state.values = values), builder),
      update: (values) => ((state.op = 'update'), (state.values = values), builder),
      then: (resolve, reject) => Promise.resolve(run()).then(resolve, reject),
    }
    return builder
  }
  return { client: { from }, writes }
}

const env = {
  CRON_SECRET: 's3cret',
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  TELEGRAM_BOT_TOKEN: '123:abc',
  TELEGRAM_CHAT_ID: '42',
  APP_URL: 'https://app.example.com',
}
const NOW = new Date('2026-11-09T05:00:00Z') // 07:00 in Kyiv

function seed() {
  return {
    client_policies: [
      {
        id: 1, client_id: 10, policy_number: 'EP-200000001', start_date: '2025-11-17', end_date: '2026-11-16',
        comment: 'ЗАЗ Ланос, BC1234AA', insurance_company_code: 'BBS', insurance_policy_type: 'CPV',
        renewal_status: null, reminders_snoozed_until: null,
        clients: { first_name: 'Олена', last_name: 'Коваленко', phone_number: '(050) 111 22 33' },
        insurance_policy_types: { name: 'Цивілка' },
      },
      { id: 2, client_id: 11, start_date: '2026-01-01', end_date: '2027-01-01', insurance_policy_type: 'CPV' }, // not due
    ],
    notifications: [],
  }
}

async function run({
  query = {}, auth = 'Bearer s3cret', envOverrides = {}, tables = seed(), send = vi.fn(async () => ({})),
  now = NOW, userAgent,
} = {}) {
  const db = fakeSupabase(tables)
  const { status, body } = await runReminders({
    headers: { authorization: auth, ...(userAgent && { 'user-agent': userAgent }) },
    query,
    env: { ...env, ...envOverrides },
    now,
    supabase: db.client,
    send,
    pause: async () => {},
  })
  return { res: { statusCode: status, body }, send, db, tables }
}

describe('HTTP entry points (Web Request/Response)', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('renewal-reminders GET answers JSON and checks the secret from the request headers', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    const denied = await GET(new Request('https://app.example.com/api/renewal-reminders?dry=1'))
    expect(denied.status).toBe(401)
    expect(await denied.json()).toEqual({ error: 'Unauthorized' })
  })

  it('reads query parameters through the standard URL API', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    vi.stubEnv('VITE_SUPABASE_URL', '')
    const response = await GET(new Request('https://app.example.com/api/renewal-reminders?dry=1', {
      headers: { Authorization: 'Bearer s3cret' },
    }))
    // dry=1 was understood: the Telegram settings are not required in dry-run mode
    expect(await response.json()).toEqual({ error: 'Missing environment variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY' })
  })

  it('keep-alive GET checks the secret too', async () => {
    vi.stubEnv('CRON_SECRET', 's3cret')
    const denied = await keepAlive(new Request('https://app.example.com/api/keep-alive'))
    expect(denied.status).toBe(401)
  })
})

describe('delivery time (10:00 Kyiv)', () => {
  const cron = 'vercel-cron/1.0'

  it('sends from the scheduled run that falls at 10:xx Kyiv time, in winter and summer', async () => {
    const winter = await run({ userAgent: cron, now: new Date('2026-11-09T08:00:00Z') }) // 10:00 Kyiv (UTC+2)
    expect(winter.res.body).toMatchObject({ sent: 1 })

    const summerTables = seed()
    summerTables.client_policies[0].end_date = '2026-07-22'
    const summer = await run({ userAgent: cron, now: new Date('2026-07-15T07:45:00Z'), tables: summerTables }) // 10:45 (UTC+3)
    expect(summer.res.body).toMatchObject({ sent: 1 })
  })

  it('skips the other scheduled run without reading or sending anything', async () => {
    const { res, send, db } = await run({ userAgent: cron, now: new Date('2026-11-09T07:00:00Z') }) // 09:00 Kyiv
    expect(res.body).toEqual({ skipped: 'Outside the delivery hour', kyivHour: 9 })
    expect(send).not.toHaveBeenCalled()
    expect(db.writes).toEqual([])
  })

  it('does not limit manual runs', async () => {
    const { res } = await run({ now: new Date('2026-11-09T07:00:00Z'), userAgent: 'curl/8.0' })
    expect(res.body).toMatchObject({ sent: 1 })
  })
})

describe('renewal-reminders job', () => {
  it('rejects calls without the cron secret, and refuses to run without one', async () => {
    expect((await run({ auth: 'Bearer wrong' })).res.statusCode).toBe(401)
    expect((await run({ envOverrides: { CRON_SECRET: '' } })).res.body).toEqual({ error: 'CRON_SECRET is not set' })
  })

  it('names missing settings', async () => {
    const { res } = await run({ envOverrides: { SUPABASE_SERVICE_ROLE_KEY: '', TELEGRAM_CHAT_ID: '' } })
    expect(res.statusCode).toBe(500)
    expect(res.body.error).toBe('Missing environment variables: SUPABASE_SERVICE_ROLE_KEY, TELEGRAM_CHAT_ID')
  })

  it('shows the message in dry-run mode without sending or saving', async () => {
    const { res, send, db } = await run({ query: { dry: '1' } })
    expect(res.body).toMatchObject({ today: '2026-11-09', dryRun: true, due: 1 })
    expect(res.body.messages[0]).toContain('<b>🟡 Ends within 7 days</b>')
    expect(send).not.toHaveBeenCalled()
    expect(db.writes).toEqual([])
  })

  it('sends the reminder once, logs it, and sends nothing on a second run', async () => {
    const tables = seed()
    const first = await run({ tables })
    expect(first.res.body).toEqual({ today: '2026-11-09', due: 1, sent: 1, failed: 0 })
    expect(first.send).toHaveBeenCalledTimes(1)
    expect(first.send.mock.calls[0][0]).toContain('Коваленко Олена')
    expect(first.send.mock.calls[0][1]).toEqual({ token: '123:abc', chatId: '42' })
    expect(tables.notifications).toMatchObject([{ policy_id: 1, kind: 'renewal', days_before: 7, channel: 'telegram', status: 'sent' }])

    const second = await run({ tables })
    expect(second.res.body).toEqual({ today: '2026-11-09', due: 0, sent: 0 })
    expect(second.send).not.toHaveBeenCalled()
  })

  it('records a failed send and retries it on the next run', async () => {
    const tables = seed()
    const failing = vi.fn(async () => { throw new TelegramError('Chat not found: check TELEGRAM_CHAT_ID', { code: 400 }) })
    const first = await run({ tables, send: failing })
    expect(first.res.statusCode).toBe(502)
    expect(first.res.body).toMatchObject({ sent: 0, failed: 1, error: 'Chat not found: check TELEGRAM_CHAT_ID' })
    expect(tables.notifications[0]).toMatchObject({ status: 'failed', attempts: 1 })

    const second = await run({ tables })
    expect(second.res.body).toMatchObject({ sent: 1, failed: 0 })
    expect(tables.notifications).toHaveLength(1)
    expect(tables.notifications[0].status).toBe('sent')
  })

  it('stops for policies marked renewed', async () => {
    const tables = seed()
    tables.client_policies[0].renewal_status = 'renewed'
    const { res, send } = await run({ tables })
    expect(res.body.due).toBe(0)
    expect(send).not.toHaveBeenCalled()
  })

  it('sends a test message', async () => {
    const { res, send } = await run({ query: { test: '1' } })
    expect(res.body).toEqual({ test: 'sent' })
    expect(send.mock.calls[0][0]).toContain('Telegram reminders are set up')
  })
})

describe('sendTelegramMessage', () => {
  const ok = { json: async () => ({ ok: true, result: { message_id: 1 } }) }

  it('posts an HTML message to the chat', async () => {
    const fetchImpl = vi.fn(async () => ok)
    await sendTelegramMessage('<b>Hi</b>', { token: 'T', chatId: '42', fetchImpl })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://api.telegram.org/botT/sendMessage')
    expect(JSON.parse(init.body)).toMatchObject({ chat_id: '42', text: '<b>Hi</b>', parse_mode: 'HTML' })
  })

  it('waits and retries once when rate limited', async () => {
    const limited = { json: async () => ({ ok: false, error_code: 429, parameters: { retry_after: 3 } }) }
    const fetchImpl = vi.fn().mockResolvedValueOnce(limited).mockResolvedValueOnce(ok)
    const wait = vi.fn(async () => {})
    await sendTelegramMessage('x', { token: 'T', chatId: '42', fetchImpl, wait })
    expect(wait).toHaveBeenCalledWith(3000)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('explains common setup errors without exposing the token', async () => {
    const blocked = { json: async () => ({ ok: false, error_code: 403, description: 'Forbidden: bot was blocked by the user' }) }
    const error = await sendTelegramMessage('x', { token: 'SECRET', chatId: '42', fetchImpl: async () => blocked }).catch((e) => e)
    expect(error).toBeInstanceOf(TelegramError)
    expect(error.message).toMatch(/press Start/)
    expect(error.message).not.toContain('SECRET')
  })
})
