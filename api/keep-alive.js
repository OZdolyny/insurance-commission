// api/keep-alive.js

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    )

    // Simple query to keep database alive
    const { data, error } = await supabase
      .from('clients')
      .select('count(*)', { count: 'exact', head: true })

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ 
        error: 'Database query failed',
        details: error.message 
      })
    }

    console.log(`[Keep-Alive] Supabase pinged at ${new Date().toISOString()}`)
    
    return res.status(200).json({ 
      success: true,
      message: 'Database keep-alive successful',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Keep-alive error:', error)
    return res.status(500).json({ 
      error: 'Keep-alive failed',
      details: error.message 
    })
  }
}

// Vercel Cron - runs daily at 12:00 PM UTC
export const config = {
  crons: ['0 12 * * *']
}