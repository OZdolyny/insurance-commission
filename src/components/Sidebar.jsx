import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  BarChart3,
  Building2,
  Layers,
  Percent,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react'
import { useRef } from 'react'
import { LogOut } from 'lucide-react'
import { cn } from '../lib/utils'
import { ROLE_LABELS, useAuth } from '../lib/auth'
import { buildHash } from '../lib/router'

// Daily work first, reference data (rarely changed) second
const navGroups = [
  {
    label: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
      { id: 'clients', label: 'Clients', icon: Users },
      { id: 'policies', label: 'Policies', icon: FileText },
      { id: 'commissions', label: 'Commissions', icon: Wallet },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Setup',
    items: [
      { id: 'companies', label: 'Companies', icon: Building2 },
      { id: 'policy-types', label: 'Policy Types', icon: Layers },
      { id: 'policy-rates', label: 'Rates', icon: Percent },
    ],
  },
]

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar'

// On desktop: fixed side panel that can collapse to icons.
// On phones (< md): hidden drawer that slides in from the left.
export function Sidebar({ currentPage, collapsed, setCollapsed, mobileOpen, onMobileClose, onUploadPdf }) {
  const { user, role, signOut } = useAuth()
  // The collapsed (icons-only) look only applies on desktop
  const compact = collapsed && !mobileOpen
  const fileInputRef = useRef(null)

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground transition-[width,transform] duration-300 md:border-r md:border-sidebar-border',
          mobileOpen ? 'translate-x-0 shadow-popover' : '-translate-x-full',
          'md:z-40 md:translate-x-0 md:shadow-none',
          collapsed ? 'md:w-[4.5rem]' : 'md:w-64'
        )}
      >
        {/* Brand */}
        <div className={cn('flex h-16 shrink-0 items-center px-4', compact ? 'md:justify-center md:px-0' : 'justify-between')}>
          <a href={buildHash('dashboard')} className={cn('flex items-center gap-2.5 rounded-lg', focusRing)}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-sm shadow-indigo-950/40">
              <ShieldCheck className="h-5 w-5 text-white" />
            </span>
            <span className={cn('leading-tight', compact && 'md:hidden')}>
              <span className="block text-[15px] font-semibold tracking-tight">CommissionPro</span>
              <span className="block text-xs text-sidebar-muted">Insurance tracker</span>
            </span>
          </a>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onMobileClose}
            className={cn('rounded-lg p-2 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden', focusRing)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary action, kept apart from the page links */}
        <div className={cn('px-3 pb-3', compact && 'md:px-3')}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={compact ? 'Upload policy PDF' : undefined}
            aria-label={compact ? 'Upload policy PDF' : undefined}
            className={cn(
              'flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90',
              focusRing,
              compact && 'md:px-0'
            )}
          >
            <Upload className="h-[18px] w-[18px] shrink-0" />
            <span className={cn(compact && 'md:hidden')}>Upload PDF</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf,.p7s,application/pkcs7-mime"
            className="hidden"
            aria-label="Upload policy PDF"
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = '' // allow choosing the same file again
              if (file) onUploadPdf(file)
            }}
          />
        </div>

        <div className="mx-3 border-t border-sidebar-border" />

        {/* Navigation */}
        <nav aria-label="Pages" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div
                className={cn(
                  'mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-muted/80',
                  compact && 'md:sr-only'
                )}
              >
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.id
                  return (
                    <li key={item.id}>
                      <a
                        href={buildHash(item.id)}
                        aria-current={isActive ? 'page' : undefined}
                        title={compact ? item.label : undefined}
                        className={cn(
                          'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                          focusRing,
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                          compact && 'md:justify-center md:px-0'
                        )}
                      >
                        {isActive && (
                          <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-sidebar-primary" />
                        )}
                        <Icon className={cn('h-[18px] w-[18px] shrink-0', isActive && 'text-sidebar-primary')} />
                        <span className={cn(compact && 'md:hidden')}>{item.label}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Signed-in user */}
        <div className={cn('border-t border-sidebar-border p-3', compact && 'md:px-2')}>
          <div className={cn('flex items-center gap-3', compact && 'md:flex-col md:gap-2')}>
            <span
              aria-hidden="true"
              title={compact ? user?.email : undefined}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sm font-semibold uppercase text-sidebar-foreground"
            >
              {(user?.email || '?').slice(0, 1)}
            </span>
            <div className={cn('min-w-0 flex-1', compact && 'md:hidden')}>
              <div className="truncate text-sm font-medium" title={user?.email}>{user?.email}</div>
              <div className="text-xs text-sidebar-muted">{ROLE_LABELS[role] || role}</div>
            </div>
            <button
              type="button"
              onClick={signOut}
              aria-label="Sign out"
              title="Sign out"
              className={cn('rounded-lg p-2 text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground', focusRing)}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-sidebar-border p-3 md:block">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'flex h-9 w-full items-center justify-center gap-2 rounded-lg text-sm font-medium text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
              focusRing
            )}
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
