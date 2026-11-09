import { cn } from '../../lib/utils'
import { fieldClass } from './Input'

export function Textarea({ className, rows = 3, ...props }) {
  return <textarea rows={rows} className={cn(fieldClass, 'flex min-h-16 py-2', className)} {...props} />
}
