import {
  LayoutDashboard,
  Users,
  FileText,
  DollarSign,
  Building2,
  Layers,
  Percent,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
} from 'lucide-react'
import { useRef } from 'react'
import { cn } from '../lib/utils'
import { buildHash } from '../lib/router'

const navItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'policies', label: 'Policies', icon: FileText },
  { id: 'commissions', label: 'Commissions', icon: DollarSign },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'policy-types', label: 'Policy Types', icon: Layers },
  { id: 'policy-rates', label: 'Rates', icon: Percent },
]

// On desktop: fixed side panel that can collapse to icons.
// On phones (< md): hidden drawer that slides in from the left.
export function Sidebar({ currentPage, collapsed, setCollapsed, mobileOpen, onMobileClose, onUploadPdf }) {
  // The collapsed (icons-only) look only applies on desktop
  const compact = collapsed && !mobileOpen
  const fileInputRef = useRef(null)

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          'md:z-40 md:translate-x-0',
          collapsed ? 'md:w-16' : 'md:w-64'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex h-16 items-center border-b border-sidebar-border px-4',
          compact ? 'md:justify-center' : 'justify-between'
        )}>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <DollarSign className="h-5 w-5 text-background" />
            </div>
            <span className={cn('font-semibold text-sidebar-foreground', compact && 'md:hidden')}>CommissionPro</span>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onMobileClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Actions, kept apart from the page links below */}
        <div className="border-b border-sidebar-border p-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={compact ? 'Upload policy PDF' : undefined}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90',
              compact && 'md:px-2'
            )}
          >
            <Upload className="h-5 w-5 shrink-0" />
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

        {/* Navigation */}
        <nav aria-label="Pages" className="flex-1 space-y-1 overflow-y-auto p-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <a
                key={item.id}
                href={buildHash(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  compact && 'md:justify-center md:px-2'
                )}
                title={compact ? item.label : undefined}
              >
                <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-foreground')} />
                <span className={cn(compact && 'md:hidden')}>{item.label}</span>
              </a>
            )
          })}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-sidebar-border p-2 md:block">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
