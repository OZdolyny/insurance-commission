// api/keep-alive.js
// Pings Supabase once a day so the free-tier project is not paused for inactivity.
// Scheduled by the "crons" entry in vercel.json (Vercel ignores cron settings exported from the function).
// Uses the Web-standard Request/Response signature: the older (req, res) style makes Vercel parse
// the URL with Node's deprecated url.parse(), which logs a DEP0169 warning.

import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  // If CRON_SECRET is set in Vercel, only accept calls from Vercel Cron (it sends it as a Bearer token).
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use the same Supabase project as the frontend. Don't read SUPABASE_URL / SUPABASE_ANON_KEY:
  // integrations can set those to a different project, which made the keep-alive ping the wrong database.
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('keep-alive: Supabase URL or anon key is not configured')
    return Response.json({ error: 'Server is not configured' }, { status: 500 })
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } })
    const { error } = await supabase.from('clients').select('id').limit(1)

    if (error) {
      console.error('keep-alive: Supabase query failed:', error.message, error.code)
      return Response.json({ error: 'Keep-alive query failed' }, { status: 500 })
    }

    return Response.json({ success: true, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('keep-alive: unexpected error:', error)
    return Response.json({ error: 'Keep-alive failed' }, { status: 500 })
  }
}
