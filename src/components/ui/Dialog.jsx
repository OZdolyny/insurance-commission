import { useEffect } from 'react'
import { X } from 'lucide-react'
import { CardContent, CardDescription, CardHeader, CardTitle } from './Card'
import { Button } from './Button'
import { cn } from '../../lib/utils'

// Modal dialog: closes on Escape or a click on the backdrop
// closeOnBackdrop: turn off for forms, so a stray click outside does not discard edits
export function Dialog({ open, onClose, title, description, children, size = 'md', closeOnBackdrop = true }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-xl border border-border bg-popover text-popover-foreground shadow-popover',
          size === 'lg' ? 'max-w-3xl' : 'max-w-md'
        )}
      >
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle>{title}</CardTitle>
            <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </div>
    </div>
  )
}
