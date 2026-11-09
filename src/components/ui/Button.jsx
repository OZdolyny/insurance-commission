import { cn } from '../../lib/utils'

const buttonVariants = {
  variant: {
    default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    outline: 'border border-border bg-card text-foreground shadow-sm hover:bg-muted',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
    ghost: 'text-foreground hover:bg-muted',
    link: 'text-primary underline-offset-4 hover:underline',
    success: 'bg-success text-success-foreground shadow-sm hover:bg-success/90',
    warning: 'bg-warning text-warning-foreground shadow-sm hover:bg-warning/90',
  },
  size: {
    default: 'h-10 px-4',
    sm: 'h-9 px-3',
    lg: 'h-11 px-6 text-base',
    icon: 'h-9 w-9',
  },
}

export function Button({
  className,
  variant = 'default',
  size = 'default',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
        buttonVariants.variant[variant],
        buttonVariants.size[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
