import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '../../lib/utils'

export function Table({ className, children, ...props }) {
  return (
    <div className="relative w-full overflow-auto rounded-xl border border-border bg-card shadow-card">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }) {
  return (
    <thead className={cn('border-b border-border bg-muted/70', className)} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className, children, ...props }) {
  return (
    <tbody className={cn('divide-y divide-border', className)} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, children, ...props }) {
  return (
    <tr className={cn('transition-colors hover:bg-muted/50', className)} {...props}>
      {children}
    </tr>
  )
}

const headClass = 'h-11 whitespace-nowrap px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground'

export function TableHead({ className, children, ...props }) {
  return (
    <th className={cn(headClass, className)} {...props}>
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
      className={cn(headClass, className)}
      aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          '-mx-1 inline-flex items-center gap-1 rounded px-1 uppercase hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active && 'text-foreground'
        )}
      >
        {children}
        <Icon className={cn('h-3.5 w-3.5', !active && 'opacity-50')} />
      </button>
    </th>
  )
}

export function TableCell({ className, children, ...props }) {
  return (
    <td className={cn('px-4 py-3 align-middle', className)} {...props}>
      {children}
    </td>
  )
}
