// api/keep-alive.js

export default async function handler(req, res) {
  try {
    // Step 1: Check if env vars exist
    const url = process.env.VITE_SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY

    console.log('=== ENV VAR CHECK ===')
    console.log('URL length:', url?.length || 'NOT SET')
    console.log('Key length:', key?.length || 'NOT SET')
    console.log('URL starts with https:', url?.startsWith('https') || false)

    if (!url || !key) {
      return res.status(500).json({ 
        error: 'ENV VARS NOT SET',
        url: url ? 'SET' : 'MISSING',
        key: key ? 'SET' : 'MISSING'
      })
    }

    // Step 2: Try to import and create Supabase client
    console.log('=== IMPORTING SUPABASE ===')
    const { createClient } = await import('@supabase/supabase-js')
    console.log('Supabase imported successfully')

    const supabase = createClient(url, key)
    console.log('Supabase client created successfully')

    // Step 3: Try a simple query
    console.log('=== RUNNING QUERY ===')
    const { data, error, status } = await supabase
      .from('clients')
      .select('id')
      .limit(1)

    console.log('Query response status:', status)
    console.log('Query error:', error)
    console.log('Query data:', data)

    if (error) {
      console.error('=== SUPABASE ERROR ===')
      console.error('Message:', error.message)
      console.error('Code:', error.code)
      console.error('Details:', error.details)
      console.error('Hint:', error.hint)
      
      return res.status(500).json({ 
        error: 'Query failed',
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    }

    console.log('=== SUCCESS ===')
    return res.status(200).json({ 
      success: true,
      message: 'Keep-alive successful',
      timestamp: new Date().toISOString(),
      recordsFound: data?.length || 0
    })

  } catch (error) {
    console.error('=== EXCEPTION ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    return res.status(500).json({ 
      error: 'Exception occurred',
      message: error.message,
      type: error.constructor.name
    })
  }
}

export const config = {
  crons: ['0 12 * * *']
}