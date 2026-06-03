import { cn } from '../../lib/utils'

export function Table({ className, children, ...props }) {
  return (
    <div className="relative w-full overflow-auto rounded-lg border border-border">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }) {
  return (
    <thead className={cn('border-b border-border bg-muted/50', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }) {
  return (
    <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors hover:bg-muted/50',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
}

export function TableHead({ className, children, ...props }) {
  return (
    <th
      className={cn(
        'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn('p-4 align-middle', className)} {...props}>
      {children}
    </td>
  )
}
