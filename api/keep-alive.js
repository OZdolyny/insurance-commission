// api/keep-alive.js

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  try {
    // Debug: Check if env vars exist
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

    console.log('Environment check:')
    console.log('Supabase URL exists:', !!supabaseUrl)
    console.log('Supabase Key exists:', !!supabaseKey)

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        details: 'VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set'
      })
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Attempting database query...')

    // Simple query to keep database alive
    const { data, error } = await supabase
      .from('clients')
      .select('count(*)', { count: 'exact', head: true })

    if (error) {
      console.error('Supabase error object:', JSON.stringify(error))
      return res.status(500).json({ 
        error: 'Database query failed',
        details: error.message || JSON.stringify(error),
        errorCode: error.code
      })
    }

    console.log(`[Keep-Alive SUCCESS] Supabase pinged at ${new Date().toISOString()}`)
    
    return res.status(200).json({ 
      success: true,
      message: 'Database keep-alive successful',
      timestamp: new Date().toISOString(),
      clientCount: data
    })

  } catch (error) {
    console.error('Keep-alive error:', error.toString())
    return res.status(500).json({ 
      error: 'Keep-alive failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

// Vercel Cron - runs daily at 12:00 PM UTC
export const config = {
  crons: ['0 12 * * *']
}