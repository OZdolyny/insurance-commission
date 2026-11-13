import { useState } from 'react'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, LogOut, ShieldCheck } from 'lucide-react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Label } from './ui/Label'
import { MIN_PASSWORD_LENGTH, authErrorMessage, useAuth } from '../lib/auth'

function AuthLayout({ title, description, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <main className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-white" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">{children}</div>
        <p className="mt-6 text-center text-xs text-muted-foreground">CommissionPro · Insurance tracker</p>
      </main>
    </div>
  )
}

function Message({ type = 'error', children }) {
  const Icon = type === 'error' ? AlertCircle : CheckCircle2
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={
        'flex items-start gap-2 rounded-lg border p-3 text-sm ' +
        (type === 'error' ? 'border-destructive/30 bg-destructive/10 text-destructive' : 'border-success/30 bg-success/10 text-success')
      }
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function PasswordInput({ id, value, onChange, autoComplete, ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="pr-10"
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function LoginScreen() {
  const { signIn, sendPasswordReset, linkError, clearLinkError } = useAuth()
  const [mode, setMode] = useState('login') // login | forgot
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [resetSent, setResetSent] = useState(false)

  const switchMode = (next) => {
    setMode(next)
    setError(null)
    setResetSent(false)
    clearLinkError()
  }

  const submitLogin = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(authErrorMessage(err))
      setPassword('')
    } finally {
      setBusy(false)
    }
  }

  const submitReset = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await sendPasswordReset(email)
      setResetSent(true)
    } catch (err) {
      // Rate limits are worth reporting; anything else gets the same neutral message so the form
      // does not reveal which email addresses have an account
      const message = authErrorMessage(err)
      if (/too many/i.test(message)) setError(message)
      else setResetSent(true)
    } finally {
      setBusy(false)
    }
  }

  if (mode === 'forgot') {
    return (
      <AuthLayout title="Reset your password" description="We'll email you a link to choose a new password.">
        <form onSubmit={submitReset} className="space-y-4" noValidate={false}>
          {resetSent && <Message type="success">If an account exists for this email, a reset link is on its way. Check your inbox.</Message>}
          {error && <Message>{error}</Message>}
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input id="reset-email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !email}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
          <Button variant="link" className="w-full" onClick={() => switchMode('login')}>Back to sign in</Button>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Sign in" description="Sign in to manage clients, policies and commissions.">
      <form onSubmit={submitLogin} className="space-y-4">
        {linkError && <Message>{linkError}</Message>}
        {error && <Message>{error}</Message>}
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input id="login-email" type="email" autoComplete="username" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">Password</Label>
            <button
              type="button"
              onClick={() => switchMode('forgot')}
              className="rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Forgot password?
            </button>
          </div>
          <PasswordInput id="login-password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy || !email || !password}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}

export function checkNewPassword(password, confirm) {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (!/[a-zA-Zа-яА-ЯіїєґІЇЄҐ]/.test(password) || !/\d/.test(password)) return 'Use both letters and numbers.'
  if (password !== confirm) return 'The passwords do not match.'
  return null
}

export function SetPasswordScreen() {
  const { user, setPassword, signOut } = useAuth()
  const [password, setPasswordValue] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    const problem = checkNewPassword(password, confirm)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await setPassword(password)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout title="Choose your password" description={user?.email}>
      <form onSubmit={submit} className="space-y-4">
        {error && <Message>{error}</Message>}
        {/* Hidden username field helps password managers save the new password for the right account */}
        <input type="email" autoComplete="username" value={user?.email || ''} readOnly hidden />
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput id="new-password" autoComplete="new-password" required autoFocus value={password} onChange={(e) => setPasswordValue(e.target.value)} aria-describedby="new-password-hint" />
          <p id="new-password-hint" className="text-xs text-muted-foreground">At least {MIN_PASSWORD_LENGTH} characters, with letters and numbers.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Repeat password</Label>
          <PasswordInput id="confirm-password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy || !password || !confirm}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save password
        </Button>
        <Button variant="link" className="w-full" onClick={signOut}>Cancel and sign out</Button>
      </form>
    </AuthLayout>
  )
}

export function NoAccessScreen() {
  const { user, signOut } = useAuth()
  return (
    <AuthLayout title="No access" description={user?.email}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This account is signed in but has not been given access to CommissionPro. Ask the administrator to add it.
        </p>
        <Button variant="outline" className="w-full" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </AuthLayout>
  )
}

export function AuthLoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
