import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('lets later classes override conflicting earlier ones', () => {
    expect(cn('h-9 px-3', 'h-auto p-0')).toBe('h-auto p-0')
    expect(cn('bg-card shadow-card', 'bg-popover shadow-popover')).toBe('bg-popover shadow-popover')
    expect(cn('text-primary', 'text-foreground')).toBe('text-foreground')
  })

  it('keeps text size and text color apart, including the app color tokens', () => {
    expect(cn('text-sm text-sidebar-muted')).toBe('text-sm text-sidebar-muted')
    expect(cn('text-sm', 'text-muted-foreground')).toBe('text-sm text-muted-foreground')
  })

  it('handles conditional classes', () => {
    const active = false
    expect(cn('a', active && 'b', null, ['c', { d: true, e: false }])).toBe('a c d')
  })
})
