import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { fieldClass } from './Input'

// Native <select> (best on phones and for accessibility) with a themed arrow
export function Select({ className, children, ...props }) {
  // Layout classes (width, margins) go on the wrapper; id, value, onChange etc. on the <select>
  const width = /(^|\s)w-/.test(className || '') ? '' : 'w-full'
  const height = /(^|\s)h-9(\s|$)/.test(className || '') ? 'h-9' : 'h-10'
  return (
    <div className={cn('relative', width, className)}>
      <select
        className={cn(fieldClass, 'flex cursor-pointer appearance-none pr-9', height)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}
