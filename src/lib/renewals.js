// Renewal reminders: which policies are due, and the Telegram message text.
// Used by the daily server job (api/renewal-reminders.js) and by the app.
// No imports on purpose, so plain Node can load this file directly.

// Reminder points, in days before the end date. -1 = "ended, not renewed".
export const REMINDER_OFFSETS = [30, 7, 1, 0, -1]
// "Ended" reminders are still sent if the job missed a few days
export const ENDED_GRACE_DAYS = 3
// A failed reminder is retried on later runs up to this many attempts
export const MAX_ATTEMPTS = 5
// Telegram allows 4096 characters per message; leave room for the header
const MESSAGE_LIMIT = 3900

// client_policies.renewal_status values, as shown in the app
export const RENEWAL_LABELS = { renewed: 'Renewed', not_renewing: 'Won’t renew' }

// ---- Dates (all as 'YYYY-MM-DD' strings, in Kyiv time) ----

// Today's date in Kyiv. Vercel runs in UTC, where "today" changes 2-3 hours later.
export function kyivToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

export function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

export function daysBetween(fromIso, toIso) {
  const toUtc = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(toIso) - toUtc(fromIso)) / 86400000)
}

// The closest reminder point that has been reached: 5 days left -> 7, 30 -> 30, 31 -> none
export function dueOffset(daysLeft) {
  if (daysLeft < -ENDED_GRACE_DAYS) return null
  const ascending = [...REMINDER_OFFSETS].sort((a, b) => a - b)
  const offset = ascending.find((o) => daysLeft <= o)
  return offset === undefined ? null : offset
}

// ---- Renewal detection ----

const PLATE = /\b[A-Z]{2}\d{4}[A-Z]{2}\b/

export function plateFromComment(comment) {
  return (String(comment || '').toUpperCase().match(PLATE) || [null])[0]
}

// A policy counts as renewed when the same client has a newer policy of the same type that starts
// no earlier than 30 days before this one ends (and, if both mention a plate, for the same car).
export function findRenewal(policy, allPolicies) {
  if (!policy.end_date) return null
  const earliestStart = addDays(policy.end_date, -30)
  const plate = plateFromComment(policy.comment)
  return allPolicies.find((other) => {
    if (other.id === policy.id || other.client_id !== policy.client_id) return false
    if (other.insurance_policy_type !== policy.insurance_policy_type) return false
    if (!other.start_date || other.start_date <= policy.start_date || other.start_date < earliestStart) return false
    const otherPlate = plateFromComment(other.comment)
    return !(plate && otherPlate && plate !== otherPlate)
  }) || null
}

// Whether reminders apply to this policy today: no renewal status, not snoozed, not renewed by a newer policy
export function remindersActive(policy, allPolicies, today) {
  if (policy.renewal_status) return false
  if (policy.reminders_snoozed_until && policy.reminders_snoozed_until >= today) return false
  return !findRenewal(policy, allPolicies)
}

// ---- Planning ----

// Decide which reminders to send today.
//   policies: candidates (ending within the window), with renewal_status / reminders_snoozed_until
//   allPolicies: the same clients' policies, to detect renewals
//   notifications: existing 'renewal' rows for these policies
// Returns [{ policy, daysLeft, daysBefore, notification }]; notification is set when retrying an unsent row.
export function planReminders({ policies, allPolicies = policies, notifications = [], today }) {
  const plan = []
  for (const policy of policies) {
    if (!policy.end_date || !remindersActive(policy, allPolicies, today)) continue

    const daysLeft = daysBetween(today, policy.end_date)
    const daysBefore = dueOffset(daysLeft)
    if (daysBefore === null) continue

    const rows = notifications.filter((n) => n.policy_id === policy.id)
    const existing = rows.find((n) => n.days_before === daysBefore)
    if (existing) {
      // Already sent, or failed too often: nothing to do. Pending/failed: retry.
      if (existing.status === 'sent' || existing.attempts >= MAX_ATTEMPTS) continue
      plan.push({ policy, daysLeft, daysBefore, notification: existing })
      continue
    }
    // A closer reminder was already sent (e.g. a 1-day reminder): do not send an older one
    if (rows.some((n) => n.status === 'sent' && n.days_before < daysBefore)) continue
    plan.push({ policy, daysLeft, daysBefore, notification: null })
  }
  return plan.sort((a, b) => a.daysLeft - b.daysLeft)
}

// ---- Message ----

const GROUPS = [
  { daysBefore: -1, title: '⚠️ Ended, not renewed' },
  { daysBefore: 0, title: '🔴 Ends today' },
  { daysBefore: 1, title: '🟠 Ends tomorrow' },
  { daysBefore: 7, title: '🟡 Ends within 7 days' },
  { daysBefore: 30, title: '🔵 Ends within 30 days' },
]

export function escapeHtml(value) {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// "(050) 111 22 33" -> "+380501112233" (Telegram makes it tappable)
export function internationalPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (digits.length === 10 && digits.startsWith('0')) return `+38${digits}`
  if (digits.length === 12 && digits.startsWith('380')) return `+${digits}`
  return phone ? String(phone) : ''
}

export function displayDate(isoDate) {
  const [y, m, d] = String(isoDate || '').split('-')
  return y && m && d ? `${d}.${m}.${y}` : ''
}

function whenText(daysLeft) {
  if (daysLeft < 0) return `ended ${-daysLeft} day${daysLeft === -1 ? '' : 's'} ago`
  if (daysLeft === 0) return 'today'
  if (daysLeft === 1) return 'tomorrow'
  return `in ${daysLeft} days`
}

function itemText({ policy, daysLeft }, appUrl) {
  const client = policy.clients || {}
  const name = [client.last_name, client.first_name].filter(Boolean).join(' ') || 'Unknown client'
  const phone = internationalPhone(client.phone_number)
  const details = [
    policy.policy_number,
    policy.insurance_company_code,
    policy.insurance_policy_types?.name || policy.insurance_policy_type,
  ].filter(Boolean)
  // First line of the comment holds the car and plate for imported policies
  const car = String(policy.comment || '').split('\n')[0].trim().slice(0, 80)
  const link = appUrl
    ? ` · <a href="${escapeHtml(`${appUrl.replace(/\/+$/, '')}/#/policies?client=${policy.client_id}`)}">Open</a>`
    : ''

  return [
    `• <b>${escapeHtml(name)}</b>${phone ? ` · ${escapeHtml(phone)}` : ''}`,
    details.length ? `  ${escapeHtml(details.join(' · '))}` : null,
    car ? `  ${escapeHtml(car)}` : null,
    `  Ends ${displayDate(policy.end_date)} (${whenText(daysLeft)})${link}`,
  ].filter(Boolean).join('\n')
}

// One summary for all due reminders, split into several messages if it is too long.
// Returns [{ text, items }] so the caller knows which reminders each message carried.
export function formatDigest(items, { today, appUrl } = {}) {
  const header = `🔔 <b>Policy renewals</b> · ${displayDate(today)}`
  const messages = []
  let current = { text: header, items: [] }

  for (const group of GROUPS) {
    const groupItems = items.filter((i) => i.daysBefore === group.daysBefore)
    groupItems.forEach((item, index) => {
      const text = itemText(item, appUrl)
      const titled = `<b>${group.title}</b>\n${text}`
      let block = index === 0 ? titled : text
      if (current.items.length && current.text.length + block.length + 2 > MESSAGE_LIMIT) {
        messages.push(current)
        current = { text: `${header} (continued)`, items: [] }
        block = titled // repeat the group heading in the new message
      }
      current.text += `\n\n${block}`
      current.items.push(item)
    })
  }
  if (current.items.length) messages.push(current)
  return messages
}
