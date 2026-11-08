import { describe, expect, it } from 'vitest'
import { calculateCommission, commissionTotals, formatRate, percentToRate, rateToPercent } from './commission'

describe('calculateCommission', () => {
  it('is amount x rate when the client paid in full', () => {
    expect(calculateCommission({ amount: 1000, paidAmount: 1000, rate: 0.15 })).toBe(150)
  })

  it('subtracts the discount (amount - paid) from the full commission', () => {
    expect(calculateCommission({ amount: 1000, paidAmount: 950, rate: 0.15 })).toBe(100)
  })

  it('never goes below zero', () => {
    expect(calculateCommission({ amount: 1000, paidAmount: 500, rate: 0.15 })).toBe(0)
  })

  it('is zero when "no commission" is ticked', () => {
    expect(calculateCommission({ amount: 1000, paidAmount: 1000, rate: 0.15, noCommission: true })).toBe(0)
  })

  it('is zero while inputs are incomplete', () => {
    expect(calculateCommission({ amount: '', paidAmount: 100, rate: 0.1 })).toBe(0)
    expect(calculateCommission({ amount: 100, paidAmount: 100, rate: undefined })).toBe(0)
  })

  it('accepts string inputs from form fields and rounds to cents', () => {
    expect(calculateCommission({ amount: '1234.56', paidAmount: '1234.56', rate: '0.1234' })).toBe(152.34) // 152.3447 rounds down
  })
})

describe('commissionTotals', () => {
  it('sums by payment status', () => {
    const rows = [
      { commission_amount: '100.10', payment_status: 'paid' },
      { commission_amount: '50.20', payment_status: 'pending' },
      { commission_amount: '0.30', payment_status: 'pending' },
    ]
    expect(commissionTotals(rows)).toEqual({
      total: 150.6, paid: 100.1, pending: 50.5, count: 3, paidCount: 1, pendingCount: 2,
    })
  })
})

describe('rate conversion', () => {
  it('converts between stored decimals and entered percentages', () => {
    expect(rateToPercent(0.15)).toBe('15')
    expect(rateToPercent('0.1234')).toBe('12.34')
    expect(percentToRate('15')).toBe(0.15)
    expect(percentToRate('12.34')).toBe(0.1234)
    expect(percentToRate('')).toBeNull()
  })

  it('formats a rate for display', () => {
    expect(formatRate(0.15)).toBe('15.00%')
    expect(formatRate(null)).toBe('-')
  })
})
