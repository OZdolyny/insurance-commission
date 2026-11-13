// api/keep-alive.js
// Pings Supabase once a day so the free-tier project is not paused for inactivity.
// Scheduled by the "crons" entry in vercel.json (Vercel ignores cron settings exported from the function).
// Uses the Web-standard Request/Response signature: the older (req, res) style makes Vercel parse
// the URL with Node's deprecated url.parse(), which logs a DEP0169 warning.
//
// Environment (Vercel → Settings → Environment Variables):
//   VITE_SUPABASE_URL          the same Supabase project as the app
//   SUPABASE_SERVICE_ROLE_KEY  server-only key; the data tables are not readable with the public key
//                              (it is also used by the renewal reminders)
//   CRON_SECRET                optional; when set, only Vercel Cron can call this endpoint

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// One small read from the database. Returns { ok, status, body } for the HTTP response.
export async function pingDatabase({ env = process.env, createClient = createSupabaseClient } = {}) {
  // Use the same Supabase project as the frontend. Don't read SUPABASE_URL / SUPABASE_ANON_KEY:
  // integrations can set those to a different project, which made the keep-alive ping the wrong database.
  const url = env.VITE_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('keep-alive: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured')
    return { status: 500, body: { error: 'Server is not configured' } }
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    // Still works while the public key may read the tables; fails once that access is removed
    console.warn('keep-alive: SUPABASE_SERVICE_ROLE_KEY is not set; falling back to the public key')
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const { error } = await supabase.from('clients').select('id', { head: true, count: 'estimated' }).limit(1)

    if (error) {
      console.error('keep-alive: Supabase query failed:', error.message, error.code)
      return { status: 500, body: { error: 'Keep-alive query failed' } }
    }

    // Counts only, no client data in the response or logs
    return { status: 200, body: { success: true, timestamp: new Date().toISOString() } }
  } catch (error) {
    console.error('keep-alive: unexpected error:', error)
    return { status: 500, body: { error: 'Keep-alive failed' } }
  }
}

export async function GET(request) {
  // If CRON_SECRET is set in Vercel, only accept calls from Vercel Cron (it sends it as a Bearer token).
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { status, body } = await pingDatabase()
  return Response.json(body, { status })
}
