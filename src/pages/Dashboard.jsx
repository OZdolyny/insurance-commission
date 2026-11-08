import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Select } from '../components/ui/Select'
import { Label } from '../components/ui/Label'
import { formatAmount, getYears, matchesPeriod } from '../lib/utils'
import { Users, FileText, DollarSign, TrendingUp, Clock, CheckCircle2, Lightbulb, BookOpen, AlertCircle } from 'lucide-react'

function Dashboard() {
  const [clientCount, setClientCount] = useState(0)
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateFilterType, setDateFilterType] = useState('all')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  const availableYears = getYears(policies, 'start_date')

  // Load once; changing the period only re-filters the data already loaded
  useEffect(() => {
    fetchStats()
  }, [])

  // Default the year filter to a year that has data (the current year may have none yet)
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0])
    }
  }, [policies])

  const fetchStats = async () => {
    try {
      const [clientsResult, policiesResult] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('client_policies').select('commission_amount, payment_status, start_date')
      ])

      if (clientsResult.error) throw clientsResult.error
      if (policiesResult.error) throw policiesResult.error

      setClientCount(clientsResult.count || 0)
      setPolicies(policiesResult.data || [])
      setError(null)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError(error.message || 'Could not load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  const sumCommission = (rows) => rows.reduce((sum, p) => sum + (parseFloat(p.commission_amount) || 0), 0)
  const filteredPolicies = policies.filter(p => matchesPeriod(p.start_date, dateFilterType, selectedYear, selectedMonth))
  const stats = {
    totalClients: clientCount,
    totalPolicies: filteredPolicies.length,
    totalCommissions: sumCommission(filteredPolicies),
    paidCommissions: sumCommission(filteredPolicies.filter(p => p.payment_status === 'paid')),
    pendingCommissions: sumCommission(filteredPolicies.filter(p => p.payment_status === 'pending'))
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Could not load dashboard data: {error}
        </div>
      )}

      {/* Period Filter */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Commission Period</CardTitle>
          <CardDescription>Filter statistics by time period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex gap-2">
              {['all', 'year', 'month'].map((filter) => (
                <Button
                  key={filter}
                  variant={dateFilterType === filter ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setDateFilterType(filter)}
                >
                  {filter === 'all' ? 'All Time' : filter === 'year' ? 'By Year' : 'By Month'}
                </Button>
              ))}
            </div>
            
            {dateFilterType === 'year' && availableYears.length > 0 && (
              <div className="flex items-center gap-2">
                <Label htmlFor="year-select" className="text-muted-foreground">Year:</Label>
                <Select
                  id="year-select"
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="month-year-select" className="text-muted-foreground">Year:</Label>
                  <Select
                    id="month-year-select"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-32"
                  >
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="month-select" className="text-muted-foreground">Month:</Label>
                  <Select
                    id="month-select"
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
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-bold">{stats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Policies</p>
                <p className="text-2xl font-bold">{stats.totalPolicies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold">{formatAmount(stats.totalCommissions)}</p>
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
                <p className="text-2xl font-bold text-success">{formatAmount(stats.paidCommissions)}</p>
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
                <p className="text-2xl font-bold text-warning">{formatAmount(stats.pendingCommissions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Quick Start Guide</CardTitle>
            </div>
            <CardDescription>Follow these steps to get started with your commission tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-inside space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">1</span>
                <span><strong className="text-foreground">Companies:</strong> Add the insurance companies you work with</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">2</span>
                <span><strong className="text-foreground">Policy Types:</strong> Define the types of policies you sell</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">3</span>
                <span><strong className="text-foreground">Rates:</strong> Set commission rates for each company/policy combination</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">4</span>
                <span><strong className="text-foreground">Clients:</strong> Add your clients&apos; information</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">5</span>
                <span><strong className="text-foreground">Policies:</strong> Create policies (commission is auto-calculated)</span>
              </li>
              <li className="flex gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">6</span>
                <span><strong className="text-foreground">Commissions:</strong> Track and mark commissions as paid</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              <CardTitle>Pro Tips</CardTitle>
            </div>
            <CardDescription>Get the most out of your commission tracker</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <span>Set up your companies and policy types first before adding policies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <span>Commission rates are automatically applied when creating policies</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <span>Filter commissions by status (All, Pending, Paid) for better tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <span>Discount amounts are subtracted before calculating commission</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                <span>Use the date filters above to view commissions for specific periods</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Dashboard
