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
    <tr className={cn('group transition-colors hover:bg-muted/50', className)} {...props}>
      {children}
    </tr>
  )
}

const headClass = 'h-11 whitespace-nowrap px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-muted-foreground'

// sticky="end": the column stays pinned to the right edge while a wide table scrolls sideways
// (e.g. row actions). Pinned cells need solid backgrounds, so they mix the same tints as the
// header (muted 70%) and row hover (muted 50%) into the card color; a 1px line separates them.
const stickyEnd = 'sticky right-0 z-10 shadow-[inset_1px_0_0_var(--color-border)]'
const stickyHead = `${stickyEnd} bg-[color-mix(in_oklab,var(--color-muted)_70%,var(--color-card))]`
const stickyCell = `${stickyEnd} bg-card group-hover:bg-[color-mix(in_oklab,var(--color-muted)_50%,var(--color-card))]`

export function TableHead({ className, sticky, children, ...props }) {
  return (
    <th className={cn(headClass, sticky === 'end' && stickyHead, className)} {...props}>
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

export function TableCell({ className, sticky, children, ...props }) {
  return (
    <td className={cn('px-4 py-3 align-middle', sticky === 'end' && stickyCell, className)} {...props}>
      {children}
    </td>
  )
}
