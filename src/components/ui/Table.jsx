import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
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

// Column header that sorts the table when clicked. `sort` and `onSort` come from useTableControls.
export function SortableTableHead({ sortKey, sort, onSort, className, children }) {
  const active = sort?.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown
  return (
    <th
      className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', className)}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn('inline-flex items-center gap-1 hover:text-foreground', active && 'text-foreground')}
      >
        {children}
        <Icon className="h-3.5 w-3.5" />
      </button>
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
