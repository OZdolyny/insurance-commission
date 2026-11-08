// api/keep-alive.js
// Pings Supabase once a day so the free-tier project is not paused for inactivity.
// Scheduled by the "crons" entry in vercel.json (Vercel ignores cron settings exported from the function).

export default async function handler(req, res) {
  // If CRON_SECRET is set in Vercel, only accept calls from Vercel Cron (it sends it as a Bearer token).
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Use the same Supabase project as the frontend. Don't read SUPABASE_URL / SUPABASE_ANON_KEY:
  // integrations can set those to a different project, which made the keep-alive ping the wrong database.
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('keep-alive: Supabase URL or anon key is not configured')
    return res.status(500).json({ error: 'Server is not configured' })
  }

  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(url, key)

    const { error } = await supabase.from('clients').select('id').limit(1)

    if (error) {
      console.error('keep-alive: Supabase query failed:', error.message, error.code)
      return res.status(500).json({ error: 'Keep-alive query failed' })
    }

    return res.status(200).json({ success: true, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('keep-alive: unexpected error:', error)
    return res.status(500).json({ error: 'Keep-alive failed' })
  }
}
