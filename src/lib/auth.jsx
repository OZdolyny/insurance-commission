import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authRedirect, supabase } from './supabase'

// Signed-in state for the whole app.
//   status: 'loading' | 'signed-out' | 'set-password' | 'no-access' | 'signed-in'
//   role:   the app role from public.app_users ('super_admin', 'admin', 'member'), or null
const AuthContext = createContext(null)

export const ROLE_LABELS = { super_admin: 'Super admin', admin: 'Admin', member: 'Member' }

export const MIN_PASSWORD_LENGTH = 8

// Readable messages for Supabase Auth errors. The login message never says whether an email exists.
export function authErrorMessage(error) {
  const text = String(error?.message || error || '')
  const code = error?.code || ''
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(text)) return 'Wrong email or password.'
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(text)) return 'This email address has not been confirmed yet. Use the link in the invitation email.'
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || /rate limit|too many/i.test(text)) return 'Too many attempts. Wait a few minutes and try again.'
  if (code === 'same_password' || /different from the old password/i.test(text)) return 'Choose a password different from the current one.'
  if (code === 'weak_password' || /password should be/i.test(text)) return `Choose a stronger password (at least ${MIN_PASSWORD_LENGTH} characters, mixing letters and numbers).`
  if (code === 'otp_expired' || /expired|invalid/i.test(text)) return 'This link has expired or was already used. Ask for a new one with "Forgot password?".'
  if (/failed to fetch|networkerror|load failed/i.test(text)) return 'Cannot reach the server. Check your internet connection and try again.'
  return text || 'Something went wrong. Please try again.'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  // Invitation and reset links sign the user in; they must then choose a password before using the app
  const [mustSetPassword, setMustSetPassword] = useState(authRedirect?.type === 'invite' || authRedirect?.type === 'recovery')
  const [linkError, setLinkError] = useState(authRedirect?.type === 'error' ? authErrorMessage({ code: authRedirect.code, message: authRedirect.message }) : null)

  const loadRole = useCallback(async (user) => {
    if (!user) {
      setRole(null)
      return
    }
    // Row-level security lets a user read only their own app_users row
    const { data, error } = await supabase.from('app_users').select('role').eq('user_id', user.id).maybeSingle()
    setRole(error ? null : data?.role || null)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      await loadRole(data.session?.user)
      if (active) setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return
      if (event === 'PASSWORD_RECOVERY') setMustSetPassword(true)
      if (event === 'SIGNED_OUT') setMustSetPassword(false)
      setSession(nextSession)
      // Supabase advises against awaiting other Supabase calls inside this callback
      setTimeout(() => {
        if (!active) return
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          loadRole(nextSession?.user).finally(() => active && setLoading(false))
        }
      }, 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [loadRole])

  const signIn = useCallback(async (email, password) => {
    setLinkError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const sendPasswordReset = useCallback(async (email) => {
    const redirectTo = `${window.location.origin}${window.location.pathname}`
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    if (error) throw error
  }, [])

  const setPassword = useCallback(async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setMustSetPassword(false)
  }, [])

  const user = session?.user || null
  const status = loading
    ? 'loading'
    : !user
      ? 'signed-out'
      : mustSetPassword
        ? 'set-password'
        : !role
          ? 'no-access'
          : 'signed-in'

  const value = useMemo(() => ({
    status,
    user,
    role,
    isSuperAdmin: role === 'super_admin',
    linkError,
    clearLinkError: () => setLinkError(null),
    signIn,
    signOut,
    sendPasswordReset,
    setPassword,
  }), [status, user, role, linkError, signIn, signOut, sendPasswordReset, setPassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
