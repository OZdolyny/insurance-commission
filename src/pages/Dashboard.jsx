import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { PeriodFilter } from '../components/PeriodFilter'
import { usePeriodFilter } from '../hooks/usePeriodFilter'
import { daysUntil, formatAmount, formatDate } from '../lib/utils'
import { commissionTotals } from '../lib/commission'
import { friendlyError } from '../lib/errors'
import { Users, FileText, TrendingUp, Clock, CheckCircle2, Lightbulb, BookOpen, AlertCircle, CalendarClock } from 'lucide-react'

// Renewal list: policies ending in the next 30 days, plus those that ended in the last 14
const RENEWAL_AHEAD_DAYS = 30
const RENEWAL_BEHIND_DAYS = 14

function Dashboard({ navigate }) {
  const [clientCount, setClientCount] = useState(0)
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const period = usePeriodFilter(policies, 'start_date')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const [clientsResult, policiesResult] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase
          .from('client_policies')
          .select(`
            id, client_id, commission_amount, payment_status, start_date, end_date,
            policy_number, insurance_company_code, insurance_policy_type,
            clients (first_name, last_name, phone_number)
          `)
      ])

      if (clientsResult.error) throw clientsResult.error
      if (policiesResult.error) throw policiesResult.error

      setClientCount(clientsResult.count || 0)
      setPolicies(policiesResult.data || [])
      setError(null)
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError(friendlyError(error))
    } finally {
      setLoading(false)
    }
  }

  const totals = commissionTotals(policies.filter(period.matches))
  const stats = {
    totalClients: clientCount,
    totalPolicies: totals.count,
    totalCommissions: totals.total,
    paidCommissions: totals.paid,
    pendingCommissions: totals.pending
  }

  const renewals = policies
    .map((p) => ({ ...p, daysLeft: p.end_date ? daysUntil(p.end_date) : null }))
    .filter((p) => p.daysLeft !== null && p.daysLeft <= RENEWAL_AHEAD_DAYS && p.daysLeft >= -RENEWAL_BEHIND_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft)

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
          <CardDescription>Filter statistics by policy start date</CardDescription>
        </CardHeader>
        <CardContent>
          <PeriodFilter filter={period} />
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clients</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{stats.totalClients}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Policies</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{stats.totalPolicies}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-semibold tracking-tight tabular-nums">{formatAmount(stats.totalCommissions)}</p>
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
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-success">{formatAmount(stats.paidCommissions)}</p>
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
                <p className="text-2xl font-semibold tracking-tight tabular-nums text-warning">{formatAmount(stats.pendingCommissions)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Renewal reminders */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-warning" />
            <CardTitle>Upcoming Renewals</CardTitle>
          </div>
          <CardDescription>
            Policies ending in the next {RENEWAL_AHEAD_DAYS} days, or that ended in the last {RENEWAL_BEHIND_DAYS} days
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No policies are due for renewal.</p>
          ) : (
            <ul className="divide-y divide-border">
              {renewals.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <div className="min-w-0">
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 font-medium text-foreground"
                      onClick={() => navigate('policies', { client: p.client_id })}
                    >
                      {p.clients?.first_name} {p.clients?.last_name}
                    </Button>
                    <div className="text-xs text-muted-foreground">
                      {p.insurance_company_code} · {p.insurance_policy_type}
                      {p.policy_number && ` · #${p.policy_number}`}
                      {p.clients?.phone_number && ` · ${p.clients.phone_number}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{formatDate(p.end_date)}</span>
                    <Badge variant={p.daysLeft < 0 ? 'error' : p.daysLeft <= 7 ? 'warning' : 'secondary'}>
                      {p.daysLeft < 0 ? `Ended ${-p.daysLeft}d ago` : p.daysLeft === 0 ? 'Ends today' : `${p.daysLeft}d left`}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
