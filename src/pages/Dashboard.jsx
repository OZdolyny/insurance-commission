import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Dashboard() {
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPolicies: 0,
    totalCommissions: 0,
    paidCommissions: 0,
    pendingCommissions: 0
  })
  const [loading, setLoading] = useState(true)
  const [dateFilterType, setDateFilterType] = useState('all') // all, year, month
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [availableYears, setAvailableYears] = useState([])

  useEffect(() => {
    fetchStats()
  }, [dateFilterType, selectedYear, selectedMonth])

  const fetchStats = async () => {
    try {
      // Fetch total clients
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })

      // Fetch total policies
      const { count: policyCount } = await supabase
        .from('client_policies')
        .select('*', { count: 'exact', head: true })

      // Fetch all policies for commission calculations and year extraction
      const { data: policies } = await supabase
        .from('client_policies')
        .select('commission_amount, payment_status, start_date')

      // Extract unique years
      if (policies && policies.length > 0) {
        const years = policies.map(p => new Date(p.start_date).getFullYear())
        const uniqueYears = [...new Set(years)].sort((a, b) => b - a)
        setAvailableYears(uniqueYears)
      }

      // Filter policies by date
      const filteredPolicies = policies?.filter(policy => {
        const policyDate = new Date(policy.start_date)
        
        switch (dateFilterType) {
          case 'all':
            return true
          case 'year':
            return policyDate.getFullYear() === selectedYear
          case 'month':
            return policyDate.getFullYear() === selectedYear && 
                   policyDate.getMonth() + 1 === selectedMonth
          default:
            return true
        }
      }) || []

      const totalCommissions = filteredPolicies.reduce((sum, p) => sum + (parseFloat(p.commission_amount) || 0), 0)
      const paidCommissions = filteredPolicies.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + (parseFloat(p.commission_amount) || 0), 0)
      const pendingCommissions = filteredPolicies.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + (parseFloat(p.commission_amount) || 0), 0)

      setStats({
        totalClients: clientCount || 0,
        totalPolicies: policyCount || 0,
        totalCommissions: totalCommissions,
        paidCommissions: paidCommissions,
        pendingCommissions: pendingCommissions
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  return (
    <div>
      <h2>Dashboard</h2>
      
      {/* Date Filter */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <h3 style={{ fontSize: '1.1em', marginBottom: '1rem' }}>Commission Period Filter</h3>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setDateFilterType('all')}
            style={{ 
              backgroundColor: dateFilterType === 'all' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: dateFilterType === 'all' ? '600' : '400'
            }}
          >
            All Data
          </button>
          <button 
            onClick={() => setDateFilterType('year')}
            style={{ 
              backgroundColor: dateFilterType === 'year' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: dateFilterType === 'year' ? '600' : '400'
            }}
          >
            By Year
          </button>
          <button 
            onClick={() => setDateFilterType('month')}
            style={{ 
              backgroundColor: dateFilterType === 'month' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              fontWeight: dateFilterType === 'month' ? '600' : '400'
            }}
          >
            By Month
          </button>
        </div>

        {dateFilterType === 'year' && availableYears.length > 0 && (
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Select Year:</label>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{ 
                padding: '0.5rem', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                minWidth: '150px'
              }}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}

        {dateFilterType === 'month' && availableYears.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Year:</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  minWidth: '120px'
                }}
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Month:</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  minWidth: '150px'
                }}
              >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
            </div>
          </div>
        )}
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Clients</div>
          <div className="stat-value">{stats.totalClients}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Active Policies</div>
          <div className="stat-value">{stats.totalPolicies}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Total Earned</div>
          <div className="stat-value">${stats.totalCommissions.toFixed(2)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Paid</div>
          <div className="stat-value" style={{ color: '#51cf66' }}>${stats.paidCommissions.toFixed(2)}</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: '#ffd43b' }}>${stats.pendingCommissions.toFixed(2)}</div>
        </div>
      </div>

      <div className="card">
        <h3>Quick Start Guide</h3>
        <p>Welcome to your Insurance Commission Tracker! Follow these steps to get started:</p>
        <ol style={{ marginTop: '1rem', marginLeft: '1.5rem', lineHeight: '2' }}>
          <li><strong>Companies:</strong> Add the insurance companies you work with</li>
          <li><strong>Policy Types:</strong> Define the types of policies you sell (Life, Health, Auto, etc.)</li>
          <li><strong>Rates:</strong> Set commission rates for each company/policy type combination</li>
          <li><strong>Clients:</strong> Add your clients' information</li>
          <li><strong>Policies:</strong> Create policies for your clients (commission is auto-calculated)</li>
          <li><strong>Commissions:</strong> Track and mark commissions as paid</li>
        </ol>
      </div>

      <div className="card" style={{ marginTop: '1rem' }}>
        <h3>💡 Pro Tips</h3>
        <ul style={{ marginTop: '1rem', marginLeft: '1.5rem', lineHeight: '2' }}>
          <li>Set up your companies and policy types first before adding policies</li>
          <li>The commission rate will be automatically applied when you create a policy</li>
          <li>You can filter commissions by status (All, Pending, Paid)</li>
          <li>Discount amounts are automatically subtracted before calculating commission</li>
          <li>Use the date filters above to view commissions for specific periods</li>
        </ul>
      </div>
    </div>
  )
}

export default Dashboard
