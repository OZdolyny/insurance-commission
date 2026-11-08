// Commission math shared by the policy form, the commission list and the dashboard.

// Commission = policy amount x rate, minus any discount the agent gave (amount - paid), never below 0.
export function calculateCommission({ amount, paidAmount, rate, noCommission = false }) {
  if (noCommission) return 0
  const policyAmount = parseFloat(amount)
  const paid = parseFloat(paidAmount)
  const commissionRate = parseFloat(rate)
  if ([policyAmount, paid, commissionRate].some((n) => Number.isNaN(n))) return 0

  const discount = policyAmount - paid
  const fullCommission = policyAmount * commissionRate
  return Math.max(0, round2(fullCommission - discount))
}

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

export function sumCommission(rows) {
  return round2(rows.reduce((sum, row) => sum + (parseFloat(row.commission_amount) || 0), 0))
}

// Totals by payment status for a list of policies
export function commissionTotals(rows) {
  const paidRows = rows.filter((row) => row.payment_status === 'paid')
  const pendingRows = rows.filter((row) => row.payment_status === 'pending')
  return {
    total: sumCommission(rows),
    paid: sumCommission(paidRows),
    pending: sumCommission(pendingRows),
    count: rows.length,
    paidCount: paidRows.length,
    pendingCount: pendingRows.length,
  }
}

// Rates are stored as decimals (0.15) but entered and shown as percentages (15)
export function rateToPercent(rate) {
  const value = parseFloat(rate)
  if (Number.isNaN(value)) return ''
  return String(round2(value * 100))
}

export function percentToRate(percent) {
  const value = parseFloat(percent)
  if (Number.isNaN(value)) return null
  return Math.round(value * 100) / 10000
}

export function formatRate(rate) {
  const value = parseFloat(rate)
  return Number.isNaN(value) ? '-' : `${(value * 100).toFixed(2)}%`
}
