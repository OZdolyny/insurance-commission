import { formatDate } from './utils'
import { round2 } from './commission'

// Flatten a client_policies row (with joined client, company and type) into a report row
export function toReportRow(policy) {
  const client = policy.clients || {}
  return {
    id: policy.id,
    clientId: policy.client_id,
    fullName: [client.last_name, client.first_name, client.father_name].filter(Boolean).join(' '),
    policyNumber: policy.policy_number || '',
    policyDate: policy.policy_date || null,
    startDate: policy.start_date || null,
    // Period filtering uses the policy (contract) date; older policies without one use the start date
    reportDate: policy.policy_date || policy.start_date || null,
    amount: parseFloat(policy.amount) || 0,
    commission: parseFloat(policy.commission_amount) || 0,
    paymentStatus: policy.payment_status || 'pending',
    companyCode: policy.insurance_company_code || '',
    companyName: policy.insurance_companies?.name || '',
    typeCode: policy.insurance_policy_type || '',
    typeName: policy.insurance_policy_types?.name || '',
  }
}

// filters: { matchesPeriod(row) -> bool, excludeZero, company, type, status: '' | 'paid' | 'pending' }
export function filterReportRows(rows, { matchesPeriod = () => true, excludeZero = false, company = '', type = '', status = '' } = {}) {
  return rows.filter((row) =>
    matchesPeriod(row) &&
    (!excludeZero || row.commission > 0) &&
    (!company || row.companyCode === company) &&
    (!type || row.typeCode === type) &&
    (!status || row.paymentStatus === status)
  )
}

export function reportTotals(rows) {
  return {
    count: rows.length,
    amount: round2(rows.reduce((sum, row) => sum + row.amount, 0)),
    commission: round2(rows.reduce((sum, row) => sum + row.commission, 0)),
  }
}

// CSV columns, in the same order as the table. Amounts use a dot as the decimal separator.
export const reportCsvColumns = [
  { header: 'Full name', value: (r) => r.fullName },
  { header: 'Policy number', value: (r) => r.policyNumber },
  { header: 'Policy date', value: (r) => formatDate(r.policyDate) },
  { header: 'Policy amount', value: (r) => r.amount.toFixed(2) },
  { header: 'Commission', value: (r) => r.commission.toFixed(2) },
  { header: 'Company', value: (r) => [r.companyCode, r.companyName].filter(Boolean).join(' - ') },
  { header: 'Policy type', value: (r) => [r.typeCode, r.typeName].filter(Boolean).join(' - ') },
]
