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

// Invitation and password-reset emails link back to the app with the result in the URL hash, e.g.
//   #access_token=…&type=invite   or   #error=access_denied&error_code=otp_expired&error_description=…
// The Supabase client reads and then clears that hash, so note what kind of link it was before creating it.
export const authRedirect = readAuthRedirect(typeof window === 'undefined' ? '' : window.location.hash)

export function readAuthRedirect(hash) {
  const params = new URLSearchParams(String(hash || '').replace(/^#/, ''))
  if (params.get('error') || params.get('error_code')) {
    return { type: 'error', code: params.get('error_code') || params.get('error'), message: params.get('error_description') || '' }
  }
  if (params.get('access_token')) return { type: params.get('type') || 'signin' } // invite | recovery | signup | magiclink
  return null
}

export const supabase = supabaseConfigError
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true, // stay signed in on this device until "Sign out"
        autoRefreshToken: true,
        detectSessionInUrl: true, // finish sign-in from invitation and reset links
      },
    })

// After an error link (e.g. an expired invitation), remove the error details from the address bar
if (authRedirect?.type === 'error' && typeof window !== 'undefined') {
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}
