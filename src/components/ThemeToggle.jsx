import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '../lib/utils'

const OPTIONS = [
  { value: 'light', label: 'Light theme', icon: Sun },
  { value: 'dark', label: 'Dark theme', icon: Moon },
  { value: 'system', label: 'Use device theme', icon: Monitor },
]

// Three-way switch: Light / Dark / System
export function ThemeToggle({ preference, onChange }) {
  return (
    <div role="radiogroup" aria-label="Color theme" className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-card">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = preference === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => onChange(value)}
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}
