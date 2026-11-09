import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { Table, TableHeader, TableBody, TableRow, TableCell, SortableTableHead } from '../components/ui/Table'
import { useToast } from '../components/ui/Toast'
import { PeriodFilter } from '../components/PeriodFilter'
import { usePeriodFilter } from '../hooks/usePeriodFilter'
import { useTableControls } from '../hooks/useTableControls'
import { formatAmount, formatDate } from '../lib/utils'
import { filterReportRows, reportCsvColumns, reportTotals, toReportRow } from '../lib/reports'
import { downloadCsv, toCsv } from '../lib/csv'
import { friendlyError } from '../lib/errors'
import { BarChart3, Download, RotateCcw } from 'lucide-react'

const sorters = {
  name: (r) => r.fullName,
  number: (r) => r.policyNumber,
  date: (r) => r.policyDate,
  amount: (r) => r.amount,
  commission: (r) => r.commission,
  company: (r) => r.companyCode,
  type: (r) => r.typeCode,
}

function Reports({ navigate }) {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [companies, setCompanies] = useState([])
  const [policyTypes, setPolicyTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState('')
  const [type, setType] = useState('')
  const [excludeZero, setExcludeZero] = useState(false)

  const period = usePeriodFilter(rows, 'reportDate')

  useEffect(() => {
    fetchData()
    // Load once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    try {
      const [policiesResult, companiesResult, typesResult] = await Promise.all([
        supabase
          .from('client_policies')
          .select(`
            id, client_id, policy_number, policy_date, start_date, amount, commission_amount,
            insurance_company_code, insurance_policy_type,
            clients (first_name, last_name, father_name),
            insurance_companies (name),
            insurance_policy_types (name)
          `),
        supabase.from('insurance_companies').select('code, name').order('name'),
        supabase.from('insurance_policy_types').select('type, name').order('name'),
      ])
      const failed = [policiesResult, companiesResult, typesResult].find((r) => r.error)
      if (failed) throw failed.error

      setRows((policiesResult.data || []).map(toReportRow))
      setCompanies(companiesResult.data || [])
      setPolicyTypes(typesResult.data || [])
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  const filtered = filterReportRows(rows, { matchesPeriod: period.matches, excludeZero, company, type })
  const table = useTableControls(filtered, {
    searchText: () => '',
    sorters,
    defaultSort: { key: 'date', dir: 'desc' },
  })
  const totals = reportTotals(table.rows)

  const filtersActive = period.type !== 'all' || excludeZero || company || type
  const resetFilters = () => {
    period.setType('all')
    setExcludeZero(false)
    setCompany('')
    setType('')
  }

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`report-${stamp}.csv`, toCsv(table.rows, reportCsvColumns))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading report...</div>
      </div>
    )
  }

  const sortProps = { sort: table.sort, onSort: table.toggleSort }
  const missingDates = table.rows.filter((r) => !r.policyDate).length

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                The period uses the policy date. Policies without one use their start date.
              </CardDescription>
            </div>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
                Reset filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <span className="text-sm font-medium">Period</span>
            <PeriodFilter filter={period} allowCustom />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="report-company">Company</Label>
              <Select id="report-company" value={company} onChange={(e) => setCompany(e.target.value)}>
                <option value="">All companies</option>
                {companies.map((c) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-type">Policy Type</Label>
              <Select id="report-type" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="">All policy types</option>
                {policyTypes.map((t) => <option key={t.type} value={t.type}>{t.type} - {t.name}</option>)}
              </Select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
              <input
                type="checkbox"
                checked={excludeZero}
                onChange={(e) => setExcludeZero(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Exclude zero commission
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Totals */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Policies', value: totals.count },
          { label: 'Total policy amount', value: formatAmount(totals.amount) },
          { label: 'Total commission', value: formatAmount(totals.commission), accent: true },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums ${item.accent ? 'text-success' : ''}`}>
                {item.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Report</h2>
            {missingDates > 0 && (
              <p className="text-sm text-muted-foreground">{missingDates} of {table.rows.length} policies have no policy date yet.</p>
            )}
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={table.rows.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {table.rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                {rows.length === 0 ? 'No policies yet.' : 'No policies match the selected filters.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="name" {...sortProps}>Full Name</SortableTableHead>
                <SortableTableHead sortKey="number" {...sortProps}>Policy Number</SortableTableHead>
                <SortableTableHead sortKey="date" {...sortProps}>Policy Date</SortableTableHead>
                <SortableTableHead sortKey="amount" {...sortProps} className="text-right">Policy Amount</SortableTableHead>
                <SortableTableHead sortKey="commission" {...sortProps} className="text-right">Commission</SortableTableHead>
                <SortableTableHead sortKey="company" {...sortProps}>Company</SortableTableHead>
                <SortableTableHead sortKey="type" {...sortProps}>Policy Type</SortableTableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 font-medium text-foreground"
                      onClick={() => navigate('policies', { client: row.clientId })}
                    >
                      {row.fullName || '—'}
                    </Button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{row.policyNumber || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.policyDate ? formatDate(row.policyDate) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">{formatAmount(row.amount)}</TableCell>
                  <TableCell className={`whitespace-nowrap text-right font-medium ${row.commission > 0 ? 'text-success' : 'text-muted-foreground'}`}>
                    {formatAmount(row.commission)}
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{row.companyCode}</span>
                    <span className="ml-2 text-muted-foreground">{row.companyName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{row.typeCode}</span>
                    <span className="ml-2 text-muted-foreground">{row.typeName}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <tfoot className="border-t border-border bg-muted/70 font-semibold">
              <tr>
                <td className="px-4 py-3" colSpan={3}>Total ({totals.count})</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">{formatAmount(totals.amount)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-success">{formatAmount(totals.commission)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </Table>
        )}
      </div>
    </div>
  )
}

export default Reports
