import { cn } from '../../lib/utils'

// Shared field look, also used by Select and textareas
export const fieldClass =
  'w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-sm transition-colors ' +
  'placeholder:text-muted-foreground ' +
  'focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/25 ' +
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 ' +
  'aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20'

export function Input({ className, type = 'text', ...props }) {
  return (
    <input
      type={type}
      className={cn(fieldClass, 'flex h-10', className)}
      {...props}
    />
  )
}
