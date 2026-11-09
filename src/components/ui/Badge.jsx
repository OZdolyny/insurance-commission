import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-primary/10 text-primary ring-primary/20',
  secondary: 'bg-secondary text-secondary-foreground ring-border',
  destructive: 'bg-destructive/10 text-destructive ring-destructive/25',
  outline: 'bg-transparent text-foreground ring-border',
  success: 'bg-success/10 text-success ring-success/25',
  warning: 'bg-warning/10 text-warning ring-warning/25',
  error: 'bg-destructive/10 text-destructive ring-destructive/25',
}

export function Badge({ className, variant = 'default', children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
