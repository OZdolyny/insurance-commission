import { describe, expect, it } from 'vitest'
import { filterReportRows, reportCsvColumns, reportTotals, toReportRow } from './reports'
import { toCsv } from './csv'
import { matchesPeriod } from './utils'

const policy = (overrides) => ({
  id: 1,
  client_id: 5,
  policy_number: 'EP-1',
  policy_date: '2026-09-07',
  start_date: '2026-09-08',
  amount: '2416.00',
  commission_amount: '362.40',
  insurance_company_code: 'BBS',
  insurance_policy_type: 'CPV',
  clients: { first_name: 'Олена', last_name: 'Коваленко', father_name: 'Петрівна' },
  insurance_companies: { name: 'BBS Insurance' },
  insurance_policy_types: { name: 'Цивілка' },
  ...overrides,
})

const rows = [
  toReportRow(policy({})),
  toReportRow(policy({ id: 2, policy_date: null, start_date: '2025-12-30', commission_amount: '0' })),
  toReportRow(policy({ id: 3, policy_date: '2026-10-01', insurance_company_code: 'ARS', insurance_policy_type: 'CRC', commission_amount: '100.10', amount: '1000' })),
]

describe('toReportRow', () => {
  it('builds the full name and uses the start date when the policy date is empty', () => {
    expect(rows[0]).toMatchObject({ fullName: 'Коваленко Олена Петрівна', policyDate: '2026-09-07', reportDate: '2026-09-07', amount: 2416, commission: 362.4 })
    expect(rows[1]).toMatchObject({ policyDate: null, reportDate: '2025-12-30' })
  })
})

describe('filterReportRows', () => {
  it('filters by period, zero commission, company and type', () => {
    const in2026 = (r) => matchesPeriod(r.reportDate, 'year', 2026)
    expect(filterReportRows(rows, { matchesPeriod: in2026 }).map((r) => r.id)).toEqual([1, 3])
    expect(filterReportRows(rows, { excludeZero: true }).map((r) => r.id)).toEqual([1, 3])
    expect(filterReportRows(rows, { company: 'ARS' }).map((r) => r.id)).toEqual([3])
    expect(filterReportRows(rows, { type: 'CPV' }).map((r) => r.id)).toEqual([1, 2])
    expect(filterReportRows(rows, { company: 'BBS', excludeZero: true }).map((r) => r.id)).toEqual([1])
  })
})

describe('reportTotals and CSV', () => {
  it('sums amounts and commissions', () => {
    expect(reportTotals(rows)).toEqual({ count: 3, amount: 5832, commission: 462.5 })
  })

  it('exports the table columns', () => {
    const csv = toCsv([rows[0], rows[1]], reportCsvColumns).split('\r\n')
    expect(csv[0]).toBe('Full name,Policy number,Policy date,Policy amount,Commission,Company,Policy type')
    expect(csv[1]).toBe('Коваленко Олена Петрівна,EP-1,07/09/2026,2416.00,362.40,BBS - BBS Insurance,CPV - Цивілка')
    expect(csv[2]).toContain(',EP-1,,2416.00,0.00,') // empty policy date stays empty
  })
})

describe('commission status filter', () => {
  const withStatus = [
    toReportRow(policy({ id: 21, payment_status: 'paid' })),
    toReportRow(policy({ id: 22, payment_status: 'pending' })),
    toReportRow(policy({ id: 23, payment_status: undefined })), // missing status counts as pending, like the database default
  ]

  it('keeps all rows when no status is chosen', () => {
    expect(filterReportRows(withStatus, { status: '' }).map((r) => r.id)).toEqual([21, 22, 23])
  })

  it('keeps only paid or only pending rows', () => {
    expect(filterReportRows(withStatus, { status: 'paid' }).map((r) => r.id)).toEqual([21])
    expect(filterReportRows(withStatus, { status: 'pending' }).map((r) => r.id)).toEqual([22, 23])
  })

  it('combines with the other filters', () => {
    expect(filterReportRows(withStatus, { status: 'pending', company: 'ARS' })).toEqual([])
  })
})
