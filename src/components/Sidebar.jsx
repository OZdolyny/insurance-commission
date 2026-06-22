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
} from 'lucide-react'
import { cn } from '../lib/utils'

const navItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'policies', label: 'Policies', icon: FileText },
  { id: 'commissions', label: 'Commissions', icon: DollarSign },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'policy-types', label: 'Policy Types', icon: Layers },
  { id: 'policy-rates', label: 'Rates', icon: Percent },
]

export function Sidebar({ currentPage, setCurrentPage, collapsed, setCollapsed }) {
  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex h-16 items-center border-b border-sidebar-border px-4',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <DollarSign className="h-5 w-5 text-background" />
            </div>
            <span className="font-semibold text-sidebar-foreground">CommissionPro</span>
          </div>
        )}
        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
            <DollarSign className="h-5 w-5 text-background" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-foreground')} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
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
  )
}
