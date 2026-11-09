import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Badge } from '../components/ui/Badge'
import { Dialog } from '../components/ui/Dialog'
import { SearchInput } from '../components/ui/SearchInput'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, SortableTableHead } from '../components/ui/Table'
import { useToast } from '../components/ui/Toast'
import { PeriodFilter } from '../components/PeriodFilter'
import { usePeriodFilter } from '../hooks/usePeriodFilter'
import { useTableControls } from '../hooks/useTableControls'
import { formatAmount, formatDate, maskDateInput, parseDateInput, todayDateInput } from '../lib/utils'
import { commissionTotals, formatRate } from '../lib/commission'
import { downloadCsv, toCsv } from '../lib/csv'
import { friendlyError } from '../lib/errors'
import { CheckCircle2, DollarSign, TrendingUp, Clock, Download } from 'lucide-react'

const clientName = (c) => `${c.clients?.first_name || ''} ${c.clients?.last_name || ''}`.trim()

const sorters = {
  client: clientName,
  company: (c) => c.insurance_company_code,
  type: (c) => c.insurance_policy_type,
  premium: (c) => parseFloat(c.amount),
  commission: (c) => parseFloat(c.commission_amount),
  status: (c) => c.payment_status,
  start: (c) => c.start_date,
}

const csvColumns = [
  { header: 'Client', value: clientName },
  { header: 'Phone', value: (c) => c.clients?.phone_number },
  { header: 'Policy number', value: (c) => c.policy_number },
  { header: 'Company', value: (c) => c.insurance_company_code },
  { header: 'Company name', value: (c) => c.insurance_companies?.name },
  { header: 'Policy type', value: (c) => c.insurance_policy_type },
  { header: 'Policy amount', value: (c) => c.amount },
  { header: 'Paid amount', value: (c) => c.paid_amount },
  { header: 'Commission rate %', value: (c) => (parseFloat(c.commission_rate) * 100).toFixed(2) },
  { header: 'Commission', value: (c) => c.commission_amount },
  { header: 'Status', value: (c) => c.payment_status },
  { header: 'Start date', value: (c) => formatDate(c.start_date) },
  { header: 'End date', value: (c) => formatDate(c.end_date) },
  { header: 'Payment date', value: (c) => formatDate(c.payment_date) },
]

function Commissions() {
  const toast = useToast()
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState(new Set())
  // Ids being marked as paid in the payment-date dialog (one row or a bulk selection)
  const [payingIds, setPayingIds] = useState(null)
  const [paymentDate, setPaymentDate] = useState(todayDateInput())
  const [saving, setSaving] = useState(false)

  const period = usePeriodFilter(commissions, 'start_date')

  useEffect(() => {
    fetchCommissions()
    // Load once when the page opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchCommissions = async () => {
    try {
      const { data, error } = await supabase
        .from('client_policies')
        .select(`
          *,
          clients (id, first_name, last_name, phone_number),
          insurance_companies (code, name),
          insurance_policy_types (type, name)
        `)
        .order('start_date', { ascending: false })

      if (error) throw error
      setCommissions(data || [])
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  const openPaymentDialog = (ids) => {
    setPayingIds(ids)
    setPaymentDate(todayDateInput())
  }

  const confirmMarkAsPaid = async () => {
    const date = parseDateInput(paymentDate)
    if (!date) {
      toast.error('Payment date is not a valid date. Use dd/mm/yyyy.')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('client_policies')
        .update({ payment_status: 'paid', payment_date: date })
        .in('id', payingIds)

      if (error) throw error

      toast.success(payingIds.length === 1 ? 'Commission marked as paid.' : `${payingIds.length} commissions marked as paid.`)
      setSelectedIds(new Set())
      setPayingIds(null)
      fetchCommissions()
    } catch (error) {
      toast.error(friendlyError(error))
    } finally {
      setSaving(false)
    }
  }

  const markAsPending = async (policyId) => {
    try {
      const { error } = await supabase
        .from('client_policies')
        .update({ payment_status: 'pending', payment_date: null })
        .eq('id', policyId)

      if (error) throw error
      toast.success('Commission marked as pending.')
      fetchCommissions()
    } catch (error) {
      toast.error(friendlyError(error))
    }
  }

  const inPeriod = commissions.filter(period.matches)
  const filtered = inPeriod.filter((c) => statusFilter === 'all' || c.payment_status === statusFilter)

  const table = useTableControls(filtered, {
    searchText: (c) => [
      clientName(c), c.clients?.phone_number, c.policy_number,
      c.insurance_company_code, c.insurance_companies?.name, c.insurance_policy_type,
    ].join(' '),
    sorters,
    defaultSort: { key: 'start', dir: 'desc' },
  })

  // Only pending rows that are currently visible can be selected
  const selectableIds = table.rows.filter((c) => c.payment_status === 'pending').map((c) => c.id)
  const visibleSelected = selectableIds.filter((id) => selectedIds.has(id))
  const allSelected = selectableIds.length > 0 && visibleSelected.length === selectableIds.length

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds))
  }

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`commissions-${stamp}.csv`, toCsv(table.rows, csvColumns))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading commissions...</div>
      </div>
    )
  }

  const totals = commissionTotals(table.rows)
  const periodTotals = commissionTotals(inPeriod)
  const sortProps = { sort: table.sort, onSort: table.toggleSort }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Commissions</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatAmount(totals.total)}</p>
                <p className="text-xs text-muted-foreground">{totals.count} policies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-success">{formatAmount(totals.paid)}</p>
                <p className="text-xs text-muted-foreground">{totals.paidCount} policies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-warning">{formatAmount(totals.pending)}</p>
                <p className="text-xs text-muted-foreground">{totals.pendingCount} policies</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: `All (${periodTotals.count})` },
                { value: 'pending', label: `Pending (${periodTotals.pendingCount})` },
                { value: 'paid', label: `Paid (${periodTotals.paidCount})` },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={statusFilter === f.value ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter by Start Date</CardTitle>
          </CardHeader>
          <CardContent>
            <PeriodFilter filter={period} allowCustom />
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Commission List ({table.rows.length})</h3>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <SearchInput value={table.query} onChange={table.setQuery} placeholder="Search commissions" />
            <Button variant="secondary" onClick={exportCsv} disabled={table.rows.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {visibleSelected.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted p-3 text-sm">
            <span>{visibleSelected.length} selected</span>
            <Button variant="success" size="sm" onClick={() => openPaymentDialog(visibleSelected)}>
              Mark selected as paid
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              Clear selection
            </Button>
          </div>
        )}

        {table.rows.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No commissions found with the selected filters.</p>
            </CardContent>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all pending commissions"
                    checked={allSelected}
                    disabled={selectableIds.length === 0}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-input"
                  />
                </TableHead>
                <SortableTableHead sortKey="client" {...sortProps}>Client</SortableTableHead>
                <SortableTableHead sortKey="company" {...sortProps}>Company</SortableTableHead>
                <SortableTableHead sortKey="type" {...sortProps}>Type</SortableTableHead>
                <SortableTableHead sortKey="premium" {...sortProps}>Premium</SortableTableHead>
                <SortableTableHead sortKey="commission" {...sortProps}>Commission</SortableTableHead>
                <SortableTableHead sortKey="status" {...sortProps}>Status</SortableTableHead>
                <SortableTableHead sortKey="start" {...sortProps}>Dates</SortableTableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {table.rows.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell>
                    {commission.payment_status === 'pending' && (
                      <input
                        type="checkbox"
                        aria-label={`Select commission of ${clientName(commission)}`}
                        checked={selectedIds.has(commission.id)}
                        onChange={() => toggleSelected(commission.id)}
                        className="h-4 w-4 rounded border-input"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{clientName(commission)}</div>
                    {commission.clients?.phone_number && (
                      <div className="whitespace-nowrap text-xs text-muted-foreground">
                        {commission.clients.phone_number}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {commission.insurance_companies?.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {commission.insurance_policy_types?.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatAmount(commission.amount)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <div className="font-medium text-success">
                        {formatAmount(commission.commission_amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatRate(commission.commission_rate)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={commission.payment_status === 'paid' ? 'success' : 'warning'}>
                      {commission.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5 text-sm">
                      <div className="text-muted-foreground">{formatDate(commission.start_date)}</div>
                      {commission.payment_date && (
                        <div className="text-xs text-success">Paid: {formatDate(commission.payment_date)}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {commission.payment_status === 'pending' ? (
                      <Button variant="success" size="sm" onClick={() => openPaymentDialog([commission.id])}>
                        Mark Paid
                      </Button>
                    ) : (
                      <Button variant="warning" size="sm" onClick={() => markAsPending(commission.id)}>
                        Mark Pending
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Payment Date Dialog */}
      <Dialog
        open={!!payingIds}
        onClose={() => setPayingIds(null)}
        title="Set Payment Date"
        description={payingIds?.length > 1
          ? `When were these ${payingIds.length} commissions paid?`
          : 'When was this commission paid?'}
      >
        <div className="space-y-2">
          <Label htmlFor="payment_date">Payment Date</Label>
          <Input
            id="payment_date"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            value={paymentDate}
            onChange={(e) => setPaymentDate(maskDateInput(e.target.value))}
          />
          {paymentDate.length === 10 && !parseDateInput(paymentDate) && (
            <p className="text-sm text-destructive">Not a valid date.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={confirmMarkAsPaid} className="flex-1" disabled={saving || !parseDateInput(paymentDate)}>
            {saving ? 'Saving…' : 'Confirm'}
          </Button>
          <Button variant="secondary" onClick={() => setPayingIds(null)} className="flex-1">
            Cancel
          </Button>
        </div>
      </Dialog>
    </div>
  )
}

export default Commissions
