import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { buildHash, parseHash } from './router'
import { friendlyError } from './errors'
import { compareValues } from '../hooks/useTableControls'

describe('toCsv', () => {
  it('quotes values containing commas, quotes or line breaks', () => {
    const csv = toCsv(
      [{ name: 'Smith, John', note: 'said "hi"' }, { name: 'Ann', note: null }],
      [{ header: 'Name', value: (r) => r.name }, { header: 'Note', value: (r) => r.note }]
    )
    expect(csv).toBe('Name,Note\r\n"Smith, John","said ""hi"""\r\nAnn,')
  })
})

describe('hash router', () => {
  it('parses page and query', () => {
    expect(parseHash('#/policies?client=12')).toEqual({ page: 'policies', params: { client: '12' } })
    expect(parseHash('')).toEqual({ page: 'dashboard', params: {} })
    expect(parseHash('#/unknown')).toEqual({ page: 'dashboard', params: {} })
  })

  it('builds hashes, skipping empty params', () => {
    expect(buildHash('policies', { client: 12, q: '' })).toBe('#/policies?client=12')
    expect(buildHash('clients')).toBe('#/clients')
  })
})

describe('friendlyError', () => {
  it('maps database error codes to readable messages', () => {
    expect(friendlyError({ code: '23505' }, { duplicate: 'dup' })).toBe('dup')
    expect(friendlyError({ code: '23503' }, { inUse: 'used' })).toBe('used')
    expect(friendlyError({ message: 'boom' })).toBe('boom')
    expect(friendlyError({ message: 'TypeError: Failed to fetch' })).toMatch(/Cannot reach the server/)
  })
})

describe('compareValues', () => {
  it('sorts numbers numerically and text naturally', () => {
    expect([10, 9, 100].sort(compareValues)).toEqual([9, 10, 100])
    expect(['b2', 'b10', 'a'].sort(compareValues)).toEqual(['a', 'b2', 'b10'])
  })

  it('puts empty values last', () => {
    expect(['b', null, 'a', ''].sort(compareValues)).toEqual(['a', 'b', null, ''])
  })
})
