import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'
import { Select } from '../components/ui/Select'
import { Badge } from '../components/ui/Badge'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table'
import { formatAmount, formatDate } from '../lib/utils'
import { AlertCircle, CheckCircle2, DollarSign, TrendingUp, Clock, X } from 'lucide-react'

function Commissions() {
  const [commissions, setCommissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [filter, setFilter] = useState('all')
  
  const [dateFilterType, setDateFilterType] = useState('all')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPolicyId, setSelectedPolicyId] = useState(null)
  const [customPaymentDate, setCustomPaymentDate] = useState(new Date().toISOString().split('T')[0])

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  useEffect(() => {
    fetchCommissions()
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
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const openPaymentModal = (policyId) => {
    setSelectedPolicyId(policyId)
    setCustomPaymentDate(new Date().toISOString().split('T')[0])
    setShowPaymentModal(true)
  }

  const confirmMarkAsPaid = async () => {
    try {
      const { error } = await supabase
        .from('client_policies')
        .update({ 
          payment_status: 'paid',
          payment_date: customPaymentDate
        })
        .eq('id', selectedPolicyId)

      if (error) throw error

      setSuccess('Commission marked as paid!')
      setShowPaymentModal(false)
      setSelectedPolicyId(null)
      fetchCommissions()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  const markAsPending = async (policyId) => {
    try {
      const { error } = await supabase
        .from('client_policies')
        .update({ 
          payment_status: 'pending',
          payment_date: null
        })
        .eq('id', policyId)

      if (error) throw error

      setSuccess('Commission marked as pending!')
      fetchCommissions()
      
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error.message)
    }
  }

  const getAvailableYears = () => {
    if (commissions.length === 0) return []
    
    const years = commissions.map(c => new Date(c.start_date).getFullYear())
    return [...new Set(years)].sort((a, b) => b - a)
  }

  const filterByDate = (commission) => {
    const commissionDate = new Date(commission.start_date)
    
    switch (dateFilterType) {
      case 'all':
        return true
      
      case 'year':
        return commissionDate.getFullYear() === selectedYear
      
      case 'month':
        return commissionDate.getFullYear() === selectedYear && 
               commissionDate.getMonth() + 1 === selectedMonth
      
      case 'custom':
        if (!customStartDate || !customEndDate) return true
        const start = new Date(customStartDate)
        const end = new Date(customEndDate)
        return commissionDate >= start && commissionDate <= end
      
      default:
        return true
    }
  }

  const getFilteredCommissions = () => {
    return commissions.filter(commission => {
      const statusMatch = filter === 'all' || commission.payment_status === filter
      const dateMatch = filterByDate(commission)
      
      return statusMatch && dateMatch
    })
  }

  const calculateTotals = () => {
    const filtered = getFilteredCommissions()
    const total = filtered.reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0)
    const paid = filtered.filter(c => c.payment_status === 'paid').reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0)
    const pending = filtered.filter(c => c.payment_status === 'pending').reduce((sum, c) => sum + (parseFloat(c.commission_amount) || 0), 0)
    
    return { total, paid, pending, count: filtered.length }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading commissions...</div>
      </div>
    )
  }

  const totals = calculateTotals()
  const filteredCommissions = getFilteredCommissions()
  const availableYears = getAvailableYears()

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/50 bg-success/10 p-4 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Commissions</p>
                <p className="text-2xl font-bold">{formatAmount(totals.total)}</p>
                <p className="text-xs text-muted-foreground">{totals.count} policies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Paid</p>
                <p className="text-2xl font-bold text-success">{formatAmount(totals.paid)}</p>
                <p className="text-xs text-muted-foreground">
                  {filteredCommissions.filter(c => c.payment_status === 'paid').length} policies
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">{formatAmount(totals.pending)}</p>
                <p className="text-xs text-muted-foreground">
                  {filteredCommissions.filter(c => c.payment_status === 'pending').length} policies
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Status Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: `All (${commissions.length})` },
                { value: 'pending', label: `Pending (${commissions.filter(c => c.payment_status === 'pending').length})` },
                { value: 'paid', label: `Paid (${commissions.filter(c => c.payment_status === 'paid').length})` },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={filter === f.value ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setFilter(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Date Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter by Date</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'all', label: 'All Time' },
                { value: 'year', label: 'By Year' },
                { value: 'month', label: 'By Month' },
                { value: 'custom', label: 'Custom' },
              ].map((f) => (
                <Button
                  key={f.value}
                  variant={dateFilterType === f.value ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setDateFilterType(f.value)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {dateFilterType === 'year' && availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground">Year:</Label>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="w-32"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </Select>
              </div>
            )}

            {dateFilterType === 'month' && availableYears.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground">Year:</Label>
                  <Select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-28"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground">Month:</Label>
                  <Select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-36"
                  >
                    {months.map((month, idx) => (
                      <option key={idx + 1} value={idx + 1}>{month}</option>
                    ))}
                  </Select>
                </div>
              </div>
            )}

            {dateFilterType === 'custom' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground">From:</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-muted-foreground">To:</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commissions Table */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">Commission List ({filteredCommissions.length})</h3>
        
        {filteredCommissions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No commissions found with the selected filters.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {commission.clients?.first_name} {commission.clients?.last_name}
                        </div>
                        {commission.clients?.phone_number && (
                          <div className="text-xs text-muted-foreground">
                            {commission.clients?.phone_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                          {commission.insurance_companies?.code}
                        </span>
                      </div>
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
                          {(parseFloat(commission.commission_rate) * 100).toFixed(2)}%
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
                        <div className="text-muted-foreground">
                          {formatDate(commission.start_date)}
                        </div>
                        {commission.payment_date && (
                          <div className="text-xs text-success">
                            Paid: {formatDate(commission.payment_date)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {commission.payment_status === 'pending' ? (
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => openPaymentModal(commission.id)}
                        >
                          Mark Paid
                        </Button>
                      ) : (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => markAsPending(commission.id)}
                        >
                          Mark Pending
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Payment Date Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Set Payment Date</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPaymentModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>Choose when this commission was paid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={customPaymentDate}
                  onChange={(e) => setCustomPaymentDate(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={confirmMarkAsPaid} className="flex-1">
                  Confirm
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default Commissions
