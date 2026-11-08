import { useEffect, useState } from 'react'
import { AlertCircle, Menu } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Policies from './pages/Policies'
import Commissions from './pages/Commissions'
import Companies from './pages/Companies'
import PolicyTypes from './pages/PolicyTypes'
import PolicyRates from './pages/PolicyRates'
import { Sidebar } from './components/Sidebar'
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
  companies: 'Insurance Companies',
  'policy-types': 'Policy Types',
  'policy-rates': 'Commission Rates',
}

const pages = {
  dashboard: Dashboard,
  clients: Clients,
  policies: Policies,
  commissions: Commissions,
  companies: Companies,
  'policy-types': PolicyTypes,
  'policy-rates': PolicyRates,
}

function ConfigError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="max-w-lg rounded-xl border border-destructive/50 bg-card p-6">
        <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
          <AlertCircle className="h-5 w-5" />
          The app is not configured
        </div>
        <p className="text-sm text-muted-foreground">{supabaseConfigError}</p>
      </div>
    </div>
  )
}

function App() {
  const { page, params, navigate } = useHashRoute()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

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

  if (supabaseConfigError) return <ConfigError />

  const Page = pages[page]

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-screen bg-background">
          <Sidebar
            currentPage={page}
            collapsed={sidebarCollapsed}
            setCollapsed={setSidebarCollapsed}
            mobileOpen={mobileNavOpen}
            onMobileClose={() => setMobileNavOpen(false)}
          />

          <main
            className={cn(
              'min-h-screen transition-all duration-300',
              sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'
            )}
          >
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMobileNavOpen(true)}
                className="-ml-1 rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-foreground">{pageTitle[page]}</h1>
            </header>

            <div className="p-4 md:p-6">
              {/* key resets page state when the route's parameters change */}
              <Page key={`${page}?${new URLSearchParams(params)}`} params={params} navigate={navigate} />
            </div>
          </main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  )
}

export default App
