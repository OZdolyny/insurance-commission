import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  daysUntil, formatDate, formatPhoneNumber, getYears, maskDateInput, matchesPeriod, parseDateInput, parseLocalDate,
} from './utils'

describe('parseDateInput', () => {
  it('converts dd/mm/yyyy to yyyy-mm-dd', () => {
    expect(parseDateInput('08/11/2026')).toBe('2026-11-08')
    expect(parseDateInput('2026-11-08')).toBe('2026-11-08')
  })

  it('rejects incomplete and impossible dates', () => {
    for (const value of ['', '12/0', '31/02/2025', '29/02/2025', '00/01/2026', '15/13/2026', null]) {
      expect(parseDateInput(value)).toBeNull()
    }
  })

  it('accepts leap days', () => {
    expect(parseDateInput('29/02/2024')).toBe('2024-02-29')
  })
})

describe('maskDateInput', () => {
  it('inserts slashes while typing', () => {
    expect(maskDateInput('0811')).toBe('08/11')
    expect(maskDateInput('08112026')).toBe('08/11/2026')
    expect(maskDateInput('08/11/2026999')).toBe('08/11/2026')
  })
})

describe('local dates', () => {
  it('reads yyyy-mm-dd as a local calendar date', () => {
    const date = parseLocalDate('2026-01-01')
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 0, 1])
    expect(formatDate('2026-01-01')).toBe('01/01/2026')
  })

  it('matches periods by local year and month', () => {
    expect(matchesPeriod('2026-01-01', 'month', 2026, 1)).toBe(true)
    expect(matchesPeriod('2026-01-01', 'year', 2025)).toBe(false)
    expect(matchesPeriod(null, 'year', 2026)).toBe(false)
    expect(matchesPeriod(null, 'all')).toBe(true)
  })

  it('lists distinct years newest first', () => {
    expect(getYears([{ d: '2025-12-31' }, { d: '2026-01-01' }, { d: '2026-05-05' }, { d: null }], 'd')).toEqual([2026, 2025])
  })
})

describe('daysUntil', () => {
  afterEach(() => vi.useRealTimers())

  it('counts whole calendar days from today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 8, 23, 30))
    expect(daysUntil('2026-11-08')).toBe(0)
    expect(daysUntil('2026-11-09')).toBe(1)
    expect(daysUntil('2026-11-07')).toBe(-1)
    expect(daysUntil('2026-12-08')).toBe(30)
  })
})

describe('formatPhoneNumber', () => {
  it('formats as (XXX) XXX XX XX', () => {
    expect(formatPhoneNumber('0501234567')).toBe('(050) 123 45 67')
    expect(formatPhoneNumber('050')).toBe('(050')
  })
})
