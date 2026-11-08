import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const missing = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean)

// Set when the app is built without Supabase settings; App shows a setup message instead of crashing
export const supabaseConfigError = missing.length
  ? `Missing environment variable${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}. ` +
    'Add them to .env (see .env.example) or to your hosting settings, then rebuild.'
  : null

export const supabase = supabaseConfigError ? null : createClient(supabaseUrl, supabaseAnonKey)
