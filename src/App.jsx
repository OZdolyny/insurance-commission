import { useEffect, useState } from 'react'
import { AlertCircle, Menu } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Policies from './pages/Policies'
import Commissions from './pages/Commissions'
import Companies from './pages/Companies'
import PolicyTypes from './pages/PolicyTypes'
import PolicyRates from './pages/PolicyRates'
import Reports from './pages/Reports'
import { Sidebar } from './components/Sidebar'
import { PolicyImport } from './components/PolicyImport'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './lib/theme'
import { AuthProvider, useAuth } from './lib/auth'
import { AuthLoadingScreen, LoginScreen, NoAccessScreen, SetPasswordScreen } from './components/AuthScreens'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import { supabaseConfigError } from './lib/supabase'
import { useHashRoute } from './lib/router'
import { cn } from './lib/utils'
import './index.css'

const pageTitle = {
  dashboard: 'Overview',
  clients: 'Clients',
  policies: 'Policies',
  commissions: 'Commissions',
  reports: 'Reports',
  companies: 'Insurance Companies',
  'policy-types': 'Policy Types',
  'policy-rates': 'Commission Rates',
}

const pageDescription = {
  dashboard: 'Your commissions and renewals at a glance',
  clients: 'People you insure and their contact details',
  policies: 'Every policy, with its dates and commission',
  commissions: 'What has been paid and what is still pending',
  reports: 'Policies and commissions by period, company and type',
  companies: 'Insurers you work with',
  'policy-types': 'Kinds of insurance you sell',
  'policy-rates': 'Commission rate for each company and policy type',
}

const pages = {
  dashboard: Dashboard,
  clients: Clients,
  policies: Policies,
  commissions: Commissions,
  reports: Reports,
  companies: Companies,
  'policy-types': PolicyTypes,
  'policy-rates': PolicyRates,
}

function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-lg rounded-xl border border-destructive/40 bg-card p-6 shadow-card">
        <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
          <AlertCircle className="h-5 w-5" />
          The app is not configured
        </div>
        <p className="text-sm text-muted-foreground">{supabaseConfigError}</p>
      </div>
    </div>
  )
}

// The app itself, shown only to signed-in users with access
function AppShell({ theme }) {
  const { page, params, navigate } = useHashRoute()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  // Policy PDF chosen with the sidebar's "Upload PDF"
  const [importFile, setImportFile] = useState(null)
  // Bumped after an import is saved, so the open page reloads its data
  const [refreshKey, setRefreshKey] = useState(0)

  // Close the phone menu after navigating
  useEffect(() => {
    setMobileNavOpen(false)
  }, [page])

  useEffect(() => {
    if (!mobileNavOpen) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileNavOpen])

  useEffect(() => {
    document.title = `${pageTitle[page]} · CommissionPro`
  }, [page])

  const Page = pages[page]

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-background">
          <a
            href="#main"
            onClick={(e) => {
              e.preventDefault() // the hash is used for page routing
              document.getElementById('main')?.focus()
            }}
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
          >
            Skip to content
          </a>
          <Sidebar
            currentPage={page}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            mobileOpen={mobileNavOpen}
            onMobileClose={() => setMobileNavOpen(false)}
            onUploadPdf={(file) => {
              setMobileNavOpen(false)
              setImportFile(file)
            }}
          />

          {importFile && (
            <PolicyImport
              file={importFile}
              onClose={() => setImportFile(null)}
              onSaved={() => {
                setImportFile(null)
                // Show the saved policy: open Policies, reloading it if it is already open
                setRefreshKey((k) => k + 1)
                navigate('policies')
              }}
            />
          )}

          <div
            className={cn(
              'min-h-screen transition-[margin] duration-300',
              sidebarCollapsed ? 'md:ml-[4.5rem]' : 'md:ml-64'
            )}
          >
            <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
              <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-8">
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => setMobileNavOpen(true)}
                  className="-ml-1 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-foreground md:text-xl">{pageTitle[page]}</h1>
                  <p className="hidden truncate text-sm text-muted-foreground sm:block">{pageDescription[page]}</p>
                </div>
                <ThemeToggle preference={theme.preference} onChange={theme.setPreference} />
              </div>
            </header>

            <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 focus:outline-none md:px-8 md:py-8">
              {/* key resets page state when the route's parameters change */}
              <Page key={`${page}?${new URLSearchParams(params)}#${refreshKey}`} params={params} navigate={navigate} />
            </main>
          </div>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}

// Shows the sign-in screens until the user is signed in and has access
function AuthGate() {
  const auth = useAuth()
  const theme = useTheme() // applies the saved theme to the sign-in screens too

  switch (auth.status) {
    case 'loading':
      return <AuthLoadingScreen />
    case 'signed-out':
      return <LoginScreen />
    case 'set-password':
      return <SetPasswordScreen />
    case 'no-access':
      return <NoAccessScreen />
    default:
      return <AppShell theme={theme} />
  }
}

function App() {
  if (supabaseConfigError) return <ConfigError />
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

export default App
