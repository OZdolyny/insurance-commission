// api/renewal-reminders.js
// Daily job (Vercel Cron, see vercel.json): at 10:00 Kyiv time, sends one Telegram message listing
// the policies that end soon (30, 7, 1, 0 days before) or ended without renewal.
//
// Environment variables (Vercel > Settings > Environment Variables, server-side only):
//   CRON_SECRET               required; Vercel Cron sends it as "Authorization: Bearer ..."
//   TELEGRAM_BOT_TOKEN        from @BotFather
//   TELEGRAM_CHAT_ID          the chat the bot sends to
//   SUPABASE_SERVICE_ROLE_KEY the reminder log (notifications table) is only open to this key
//   VITE_SUPABASE_URL         the same Supabase project as the app
//   APP_URL                   optional; adds an "Open" link to each policy
//
// Manual runs (same Authorization header):
//   ?dry=1   show the message that would be sent, without sending or saving anything
//   ?test=1  send a short test message to check the bot settings

import { createClient } from '@supabase/supabase-js'
import { addDays, formatDigest, kyivHour, kyivToday, planReminders } from '../src/lib/renewals.js'
import { sendTelegramMessage, TelegramError } from './_lib/telegram.js'

// Reminders arrive at 10:00 Kyiv time all year. Vercel Cron only knows UTC, and Kyiv is UTC+2 in
// winter and UTC+3 in summer, so vercel.json runs the job at 07:00 and 08:00 UTC and the run
// that falls in this Kyiv hour sends. To change the time, update both this and the two cron entries.
const DELIVERY_HOUR_KYIV = 10

const KIND = 'renewal'
const CHANNEL = 'telegram'
const LOOK_AHEAD_DAYS = 30
const LOOK_BACK_DAYS = 3

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Vercel calls this for GET /api/renewal-reminders (cron runs and manual checks).
// It uses the Web-standard Request/Response signature: the older (req, res) style makes Vercel
// parse the URL with Node's deprecated url.parse(), which logs a DEP0169 warning on every run.
export async function GET(request) {
  const url = new URL(request.url)
  const { status, body } = await runReminders({
    headers: Object.fromEntries(request.headers), // header names are lower-case
    query: Object.fromEntries(url.searchParams),
  })
  return Response.json(body, { status })
}

const reply = (status, body) => ({ status, body })

// The job itself, kept apart from HTTP so tests can call it with fake services.
// Returns { status, body }.
export async function runReminders({ headers = {}, query = {}, ...deps } = {}) {
  const env = deps.env || process.env
  const now = deps.now || new Date()
  const send = deps.send || sendTelegramMessage
  const pause = deps.pause || sleep

  // Without a secret anyone could trigger messages, so it is required here
  if (!env.CRON_SECRET) return reply(500, { error: 'CRON_SECRET is not set' })
  if (headers.authorization !== `Bearer ${env.CRON_SECRET}`) {
    return reply(401, { error: 'Unauthorized' })
  }

  // Scheduled runs come twice a day (07:00 and 08:00 UTC); only the one at 10:xx Kyiv time sends.
  // Manual runs (curl, ?dry=1, ?test=1) are not limited.
  const scheduled = /vercel-cron/i.test(headers['user-agent'] || '')
  if (scheduled && kyivHour(now) !== DELIVERY_HOUR_KYIV) {
    return reply(200, { skipped: 'Outside the delivery hour', kyivHour: kyivHour(now) })
  }

  const dryRun = query.dry === '1' || env.TELEGRAM_DRY_RUN === '1'
  const telegram = { token: env.TELEGRAM_BOT_TOKEN, chatId: env.TELEGRAM_CHAT_ID }

  const missing = [
    !env.VITE_SUPABASE_URL && 'VITE_SUPABASE_URL',
    !env.SUPABASE_SERVICE_ROLE_KEY && 'SUPABASE_SERVICE_ROLE_KEY',
    !dryRun && !telegram.token && 'TELEGRAM_BOT_TOKEN',
    !dryRun && !telegram.chatId && 'TELEGRAM_CHAT_ID',
  ].filter(Boolean)
  if (missing.length) {
    return reply(500, { error: `Missing environment variables: ${missing.join(', ')}` })
  }

  try {
    if (query.test === '1') {
      await send('✅ <b>CommissionPro</b>: Telegram reminders are set up.', telegram)
      return reply(200, { test: 'sent' })
    }

    const supabase = deps.supabase || createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    const today = kyivToday(now)

    // 1. Policies ending soon (or recently ended)
    const { data: policies, error: policiesError } = await supabase
      .from('client_policies')
      .select(`
        id, client_id, policy_number, start_date, end_date, comment,
        insurance_company_code, insurance_policy_type, renewal_status, reminders_snoozed_until,
        clients (first_name, last_name, phone_number),
        insurance_policy_types (name)
      `)
      .gte('end_date', addDays(today, -LOOK_BACK_DAYS))
      .lte('end_date', addDays(today, LOOK_AHEAD_DAYS))
    if (policiesError) throw policiesError

    if (!policies.length) return reply(200, { today, due: 0, sent: 0 })

    // 2. The same clients' other policies (to spot renewals) and the reminders already logged
    const [othersResult, notificationsResult] = await Promise.all([
      supabase
        .from('client_policies')
        .select('id, client_id, insurance_policy_type, start_date, comment')
        .in('client_id', [...new Set(policies.map((p) => p.client_id))]),
      supabase
        .from('notifications')
        .select('id, policy_id, days_before, status, attempts')
        .eq('kind', KIND)
        .eq('channel', CHANNEL)
        .in('policy_id', policies.map((p) => p.id)),
    ])
    if (othersResult.error) throw othersResult.error
    if (notificationsResult.error) throw notificationsResult.error

    const plan = planReminders({
      policies,
      allPolicies: othersResult.data,
      notifications: notificationsResult.data,
      today,
    })
    if (!plan.length) return reply(200, { today, due: 0, sent: 0 })

    const messages = formatDigest(plan, { today, appUrl: env.APP_URL })
    if (dryRun) {
      return reply(200, { today, dryRun: true, due: plan.length, messages: messages.map((m) => m.text) })
    }

    // 3. Log new reminders before sending; the unique constraint blocks duplicates if two runs overlap
    const newRows = plan.filter((item) => !item.notification).map((item) => ({
      policy_id: item.policy.id, kind: KIND, days_before: item.daysBefore, channel: CHANNEL,
    }))
    if (newRows.length) {
      const { data: inserted, error: insertError } = await supabase
        .from('notifications')
        .upsert(newRows, { onConflict: 'policy_id,kind,days_before,channel', ignoreDuplicates: true })
        .select('id, policy_id, days_before, status, attempts')
      if (insertError) throw insertError
      for (const item of plan) {
        item.notification ||= inserted.find((n) => n.policy_id === item.policy.id && n.days_before === item.daysBefore)
      }
    }

    // 4. Send, then record the result for the reminders each message carried
    let sent = 0
    let failed = 0
    let lastError = null
    for (const [index, message] of messages.entries()) {
      // Skip reminders another run logged at the same moment (no row returned for them)
      const rows = message.items.map((item) => item.notification).filter(Boolean)
      if (!rows.length) continue
      if (index > 0) await pause(1100) // Telegram allows about one message per second per chat

      try {
        await send(message.text, telegram)
        const { error } = await supabase
          .from('notifications')
          .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
          .in('id', rows.map((r) => r.id))
        if (error) throw error
        sent += rows.length
      } catch (error) {
        if (!(error instanceof TelegramError)) throw error
        lastError = error.message
        failed += rows.length
        for (const row of rows) {
          await supabase
            .from('notifications')
            .update({ status: 'failed', attempts: (row.attempts || 0) + 1, last_error: error.message })
            .eq('id', row.id)
        }
        if (error.code === 401 || error.code === 403) break // the same problem would repeat for every message
      }
    }

    // Counts only: no client details in responses or logs
    if (failed) console.error(`renewal-reminders: ${failed} reminder(s) not sent: ${lastError}`)
    return reply(failed && !sent ? 502 : 200, { today, due: plan.length, sent, failed, ...(lastError && { error: lastError }) })
  } catch (error) {
    console.error('renewal-reminders failed:', error?.message || error)
    return reply(500, { error: error instanceof TelegramError ? error.message : 'Reminder job failed' })
  }
}
